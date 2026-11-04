import { createChromeStorage } from "../infrastructure/storage/drivers/chrome";
import { createMessageRouter } from "../infrastructure/messaging/router";
import type { ContextMenuItem } from "../infrastructure/context-menus";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createNoteApplication } from "../features/notes/compose";
import { createNoteStorage } from "../features/notes/gateways/storage";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
import { importNoteMessage } from "../features/notes/gateways/worker";

// Concrete implementations for the service worker. Register each message and menu item here.
export function createWorkerApplication() {
  const notes = createNoteApplication({
    repository: createNoteStorage(createChromeStorage(chrome.storage.local)),
    source: createSampleApisCoffeeSource(createSampleApisCoffeeClient((url, init) => globalThis.fetch(url, init))),
  });
  const router = createMessageRouter();
  router.handle(importNoteMessage, (input) => notes.importNote(input));

  const menus: ContextMenuItem[] = [{
    id: "notes.append-selection",
    title: "選択した文章をメモに追加",
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
  }];
  return { router, menus };
}
