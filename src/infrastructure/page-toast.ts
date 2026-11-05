// A short notice shown on top of the web page, e.g. after a context menu or shortcut action.
export type ToastTone = "success" | "error";

// Runs inside the page: Chrome serializes it, so it must stay self-contained (no imports, no closures).
// A closed shadow root keeps the page's CSS and scripts away from the notice, and the host element
// resets its own styles with !important so page rules cannot move or hide it.
// `action` adds one button, e.g. "Undo". Only a content script bundled from src/content can pass it:
// executeScript cannot send functions. The timer pauses while the notice is hovered or focused.
export function renderPageToast(message: string, tone: ToastTone, durationMs: number, action?: { label: string; run(): void }): boolean {
  const id = "chrome-ext-base-page-toast";
  document.getElementById(id)?.remove();
  const host = document.createElement("div");
  host.id = id;
  const reset: Array<[string, string]> = [["all", "initial"], ["position", "fixed"], ["z-index", "2147483647"], ["right", "16px"], ["bottom", "16px"]];
  for (const [name, value] of reset) host.style.setProperty(name, value, "important");
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    .toast { box-sizing: border-box; max-width: min(360px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 12px;
      font: 500 13px/1.6 system-ui, sans-serif; color: #25223b; background: #ffffff; border: 1px solid #e7e2ef;
      border-left: 4px solid #6951d7; box-shadow: 0 8px 24px rgb(37 34 59 / 18%); overflow-wrap: anywhere;
      animation: enter 160ms ease-out; }
    .toast.error { border-left-color: #ad334a; }
    .toast { display: flex; align-items: center; gap: 12px; }
    .text { flex: 1; }
    button { flex-shrink: 0; font: 600 13px/1 system-ui, sans-serif; color: #5a43c9; background: transparent;
      border: 1px solid currentColor; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
    button:focus-visible { outline: 2px solid #6951d7; outline-offset: 2px; }
    @media (prefers-color-scheme: dark) {
      .toast { color: #eee9f8; background: #28263b; border-color: #3c3751; border-left-color: #b8a5ff; }
      .toast.error { border-left-color: #f3a2b1; }
      button { color: #c9bbff; }
    }
    @keyframes enter { from { opacity: 0; transform: translateY(6px); } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }`;
  const box = document.createElement("div");
  box.className = `toast ${tone}`;
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  const text = document.createElement("span");
  text.className = "text";
  text.textContent = message;
  box.append(text);
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => { host.remove(); action.run(); });
    box.append(button);
  }
  root.append(style, box);
  (document.body ?? document.documentElement).append(host);
  let timer = setTimeout(() => host.remove(), durationMs);
  const pause = () => clearTimeout(timer);
  const resume = () => { clearTimeout(timer); if (!box.matches(":hover") && !box.contains(root.activeElement)) timer = setTimeout(() => host.remove(), durationMs); };
  box.addEventListener("pointerenter", pause);
  box.addEventListener("focusin", pause);
  box.addEventListener("pointerleave", resume);
  box.addEventListener("focusout", () => setTimeout(resume));
  return true;
}

export interface PageToasts {
  // Resolves false when the page cannot host it (browser pages, the Web Store, or no access to the tab).
  show(tabId: number, message: string, tone: ToastTone): Promise<boolean>;
}

// Needs the `scripting` permission and access to the tab: host permission, or activeTab, which Chrome
// grants for the tab where the user clicked a context menu item, pressed a shortcut, or the toolbar button.
export function createPageToasts(scripting: Pick<typeof chrome.scripting, "executeScript">, durationMs = 4_000): PageToasts {
  return {
    async show(tabId, message, tone) {
      try {
        const [result] = await scripting.executeScript({ target: { tabId }, func: renderPageToast, args: [message, tone, durationMs] });
        return result?.result === true;
      } catch {
        return false;
      }
    },
  };
}
