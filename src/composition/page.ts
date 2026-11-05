// Sample: page capture with its own preference, plus per-site access for the sidepanel.
import type { Environment } from "./environment";
import { createPageApplication } from "../features/page/compose";
import { createChromePageReader } from "../features/page/gateways/chrome";
import { createMockPageReader } from "../features/page/gateways/mock";
import { createCapturePreferencesStorage } from "../features/page/gateways/storage";
import { createSiteAccessApplication } from "../features/site-access/compose";
import { createChromeSiteAccess } from "../features/site-access/gateways/chrome";
import { createMockSiteAccess } from "../features/site-access/gateways/mock";

type PageEnvironment = Pick<Environment, "driver" | "extension">;

// Popup: the tab the toolbar button was clicked on, through the temporary activeTab grant.
export function createPopupPage(environment: PageEnvironment) {
  const reader = environment.extension ? createChromePageReader({
    query: (query) => chrome.tabs.query(query),
    executeScript: (injection) => chrome.scripting.executeScript(injection),
  }) : createMockPageReader();
  return { page: createPageApplication(reader, createCapturePreferencesStorage(environment.driver)) };
}

// Sidepanel: the active tab of the window the panel belongs to, with per-site permissions.
export async function createSidepanelPage(environment: PageEnvironment) {
  const windowId = environment.extension ? (await chrome.windows.getCurrent()).id : undefined;
  if (environment.extension && (typeof windowId !== "number" || !Number.isSafeInteger(windowId) || windowId < 0)) {
    throw new Error("The sidepanel window is unavailable.");
  }
  const access = windowId !== undefined ? createChromeSiteAccess(chrome, windowId) : createMockSiteAccess();
  const reader = windowId !== undefined ? createChromePageReader({
    query: () => chrome.tabs.query({ active: true, windowId }),
    executeScript: (input) => chrome.scripting.executeScript(input),
  }) : createMockPageReader();
  return {
    page: createPageApplication(reader, createCapturePreferencesStorage(environment.driver)),
    access: createSiteAccessApplication(access),
    accessChanges: access,
  };
}
