import type { SiteAccessChanges, SiteAccessGateway } from "../ports";
import { siteOrigin } from "../access";

function permissionPattern(origin: string) {
  const url = new URL(siteOrigin(origin));
  // Chrome host permissions cover all ports of the scheme/hostname.
  return `${url.protocol}//${url.hostname}/*`;
}

export function createChromeSiteAccess(
  browser: { tabs: typeof chrome.tabs; permissions: typeof chrome.permissions }, windowId: number,
): SiteAccessGateway & SiteAccessChanges {
  return {
    async status() {
      const [tab] = await browser.tabs.query({ active: true, windowId });
      if (!tab || typeof tab.id !== "number" || !Number.isSafeInteger(tab.id) || tab.id < 0 || !tab.url) {
        return { available: false, reason: "no-tab" };
      }
      let url: URL;
      try { url = new URL(tab.url); } catch { return { available: false, reason: "invalid-url" }; }
      if (!["http:", "https:"].includes(url.protocol)) return { available: false, reason: "unsupported-page" };
      const origin = siteOrigin(url.origin);
      const allowed = await browser.permissions.contains({ origins: [permissionPattern(origin)] });
      if (typeof allowed !== "boolean") throw new Error("サイトの権限を確認できません。");
      return { available: true, tabId: tab.id, url: url.href, origin, allowed };
    },
    grant(input) {
      // This validates the gateway boundary and invokes request before any await.
      const origin = siteOrigin(input.origin);
      return browser.permissions.request({ origins: [permissionPattern(origin)] }).then((granted) => {
        if (typeof granted !== "boolean") throw new Error("権限の応答が不正です。");
        return granted;
      });
    },
    subscribe(invalidate) {
      const activated = (info: chrome.tabs.OnActivatedInfo) => { if (info.windowId === windowId) invalidate(); };
      const updated = (_id: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
        if (tab.windowId === windowId && tab.active && (change.url !== undefined || change.status !== undefined)) invalidate();
      };
      const removed = (_id: number, info: chrome.tabs.OnRemovedInfo) => { if (info.windowId === windowId) invalidate(); };
      browser.tabs.onActivated.addListener(activated);
      browser.tabs.onUpdated.addListener(updated);
      browser.tabs.onRemoved.addListener(removed);
      browser.permissions.onAdded.addListener(invalidate);
      browser.permissions.onRemoved.addListener(invalidate);
      return () => {
        browser.tabs.onActivated.removeListener(activated);
        browser.tabs.onUpdated.removeListener(updated);
        browser.tabs.onRemoved.removeListener(removed);
        browser.permissions.onAdded.removeListener(invalidate);
        browser.permissions.onRemoved.removeListener(invalidate);
      };
    },
  };
}
