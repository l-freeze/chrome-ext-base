import { createSettingsContext } from "./settings";
import { createNoteApplication } from "../features/notes/compose";
import { createNoteChanges, createNoteStorage } from "../features/notes/gateways/storage";
import { delegateImportToWorker } from "../features/notes/gateways/worker";
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createPageApplication } from "../features/page/compose";
import { createChromePageReader } from "../features/page/gateways/chrome";
import { createMockPageReader } from "../features/page/gateways/mock";
import { createSiteAccessApplication } from "../features/site-access/compose";
import { createChromeSiteAccess } from "../features/site-access/gateways/chrome";
import { createMockSiteAccess } from "../features/site-access/gateways/mock";

export async function createSidepanelApplication() {
  const settings = createSettingsContext();
  const windowId = settings.extension ? (await chrome.windows.getCurrent()).id : undefined;
  if (settings.extension && (typeof windowId !== "number" || !Number.isSafeInteger(windowId) || windowId < 0)) {
    throw new Error("サイドパネルのウィンドウを確認できません。");
  }
  const access = windowId !== undefined ? createChromeSiteAccess(chrome, windowId) : createMockSiteAccess();
  const reader = windowId !== undefined ? createChromePageReader({
    query: () => chrome.tabs.query({ active: true, windowId }),
    executeScript: (input) => chrome.scripting.executeScript(input),
  }) : createMockPageReader();
  const notes = createNoteApplication({ repository: createNoteStorage(settings.driver), source: createSampleApisCoffeeSource(createSampleApisCoffeeClient((url, init) => globalThis.fetch(url, init))) });
  return {
    notes: settings.extension ? delegateImportToWorker(notes, createMessageClient(createChromeTransport(chrome.runtime))) : notes,
    noteChanges: createNoteChanges(settings.events),
    settings: settings.actions, settingsChanges: settings.changes,
    page: createPageApplication(reader, settings.repository),
    access: createSiteAccessApplication(access), accessChanges: access,
    preview: !settings.extension,
  };
}
