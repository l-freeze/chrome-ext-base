// Sample: the notes feature, assembled once for screens and the service worker.
import type { KeyValueStorage, StorageChanges } from "../infrastructure/storage/contracts";
import type { MessageRouter } from "../infrastructure/messaging/router";
import type { ContextMenuItem } from "../infrastructure/context-menus";
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createChromeTranslator } from "../infrastructure/i18n";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createNoteApplication } from "../features/notes/compose";
import { createNoteChanges, createNoteStorage } from "../features/notes/gateways/storage";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
import { delegateImportToWorker, importNoteMessage } from "../features/notes/gateways/worker";
import type { MessageKey } from "./i18n";

function createNotes(driver: KeyValueStorage) {
  return createNoteApplication({
    repository: createNoteStorage(driver),
    source: createSampleApisCoffeeSource(createSampleApisCoffeeClient((url, init) => globalThis.fetch(url, init))),
  });
}

// Screens: in the extension the worker runs the import; the browser preview has no worker and runs it here.
export function createNoteScreens(context: { driver: KeyValueStorage; events: StorageChanges; extension: boolean }) {
  const notes = createNotes(context.driver);
  return {
    notes: context.extension ? delegateImportToWorker(notes, createMessageClient(createChromeTransport(chrome.runtime))) : notes,
    noteChanges: createNoteChanges(context.events),
  };
}

// Worker: the import message and the "append selection" context menu item.
export function registerNoteWorker(driver: KeyValueStorage, router: MessageRouter, menus: ContextMenuItem[]) {
  const notes = createNotes(driver);
  const { t } = createChromeTranslator<MessageKey>(chrome.i18n);
  router.handle(importNoteMessage, (input) => notes.importNote(input));
  menus.push({
    id: "notes.append-selection",
    title: t("contextMenuAppendSelection"),
    contexts: ["selection"],
    async onClick(click) {
      // The worker has no UI; the toolbar badge reports a failed append until the next success.
      try {
        await notes.appendNote({ text: click.selectionText });
        await chrome.action.setBadgeText({ text: "" });
      } catch (error) {
        await chrome.action.setBadgeBackgroundColor({ color: "#ad334a" });
        await chrome.action.setBadgeText({ text: "!" });
        throw error;
      }
    },
  });
}
