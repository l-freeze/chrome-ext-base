// Sample: the notes feature, assembled once for screens and the service worker.
import type { KeyValueStorage } from "../infrastructure/storage/contracts";
import type { MessageRouter } from "../infrastructure/messaging/router";
import type { ContextMenuItem } from "../infrastructure/context-menus";
import type { CommandItem } from "../infrastructure/commands";
import { createActionBadge } from "../infrastructure/badge";
import { createPageToasts } from "../infrastructure/page-toast";
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createChromeTranslator } from "../infrastructure/i18n";
import { createHttpClient } from "../infrastructure/http";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createNoteApplication, createNoteSelectionApplication } from "../features/notes/compose";
import { createTabSelection } from "../features/notes/gateways/selection";
import { MAX_NOTE_LENGTH, NoteAppendError } from "../features/notes/note";
import type { AppendFailure } from "../features/notes/note";
import { createNoteChanges, createNoteStorage } from "../features/notes/gateways/storage";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
import { delegateImportToWorker, importNoteMessage } from "../features/notes/gateways/worker";
import type { MessageKey } from "./i18n";
import type { Environment } from "./environment";

function createNotes(driver: KeyValueStorage) {
  return createNoteApplication({
    repository: createNoteStorage(driver),
    source: createSampleApisCoffeeSource(createSampleApisCoffeeClient(createHttpClient({
      // Wrapped so fetch keeps its global receiver; 8 s per try keeps retries short.
      fetch: (url, init) => globalThis.fetch(url, init),
      timeoutMs: 8_000,
    }))),
  });
}

// Screens: in the extension the worker runs the import; the browser preview has no worker and runs it here.
export function createNoteScreens(environment: Environment) {
  const notes = createNotes(environment.driver);
  return {
    notes: environment.extension ? delegateImportToWorker(notes, createMessageClient(createChromeTransport(chrome.runtime))) : notes,
    noteChanges: createNoteChanges(environment.events),
  };
}

// Worker: the import message, the "append selection" context menu item, and the same action as a shortcut.
// The worker has no screen of its own, so results appear as a notice on the page and failures also
// leave a badge on the toolbar button until the next success.
export function registerNoteWorker(worker: { driver: KeyValueStorage; router: MessageRouter; menus: ContextMenuItem[]; commands: CommandItem[] }) {
  const repository = createNoteStorage(worker.driver);
  const notes = createNotes(worker.driver);
  const selection = createNoteSelectionApplication({ reader: createTabSelection(chrome.scripting), repository });
  const { t, language } = createChromeTranslator<MessageKey>(chrome.i18n);
  const badge = createActionBadge(chrome.action);
  const toasts = createPageToasts(chrome.scripting);
  const appendFailures: Record<AppendFailure, MessageKey> = { "no-selection": "toastNoSelection", "too-long": "toastTooLong" };

  async function report(tabId: number | undefined, append: () => Promise<unknown>) {
    try {
      await append();
      await badge.clear();
      if (tabId !== undefined) await toasts.show(tabId, t("toastAppended"), "success");
    } catch (error) {
      await badge.show("!", "#ad334a");
      const message = error instanceof NoteAppendError
        ? t(appendFailures[error.reason], new Intl.NumberFormat(language).format(MAX_NOTE_LENGTH))
        : t("toastAppendFailed");
      if (tabId !== undefined) await toasts.show(tabId, message, "error");
      // Expected outcomes are shown to the user; anything else is also logged by the worker.
      if (!(error instanceof NoteAppendError)) throw error;
    }
  }

  worker.router.handle(importNoteMessage, (input) => notes.importNote(input));
  worker.menus.push({
    id: "notes.append-selection",
    title: t("contextMenuAppendSelection"),
    contexts: ["selection"],
    onClick: (click) => report(click.tabId, () => notes.appendNote({ text: click.selectionText ?? "" })),
  });
  // The key comes from `commands` in the manifest; Chrome grants activeTab for the tab it was pressed on.
  worker.commands.push({
    name: "append-selection",
    run: ({ tabId }) => report(tabId, () => tabId === undefined
      ? Promise.reject(new NoteAppendError("no-selection"))
      : selection.appendSelection({ tabId })),
  });
}
