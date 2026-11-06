// Sample: the notes feature, assembled once for screens and the service worker.
import type { KeyValueStorage } from "../infrastructure/storage/contracts";
import { createBadgeBoard, createTabBadge } from "../infrastructure/badge";
import { createAlarmScheduler } from "../infrastructure/alarms";
import { createPageToasts } from "../infrastructure/page-toast";
import { createPageScripts } from "../infrastructure/page-scripts";
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createChromeTranslator } from "../infrastructure/i18n";
import { createHttpClient } from "../infrastructure/http";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createNoteAppendApplication, createNoteApplication, createNoteReminderApplication, createNoteReminderDismissal } from "../features/notes/compose";
import { createAlarmReminderSchedule, createBadgeReminderIndicator, silentReminderIndicator } from "../features/notes/gateways/reminder";
import { createTabSelection } from "../features/notes/gateways/selection";
import { MAX_NOTE_LENGTH, NoteAppendError } from "../features/notes/note";
import type { AppendFailure } from "../features/notes/note";
import { createAppendHistory, createNoteChanges, createNoteStorage } from "../features/notes/gateways/storage";
import { createSampleApisCoffeeSource } from "../features/notes/gateways/coffee";
import { delegateImportToWorker, importNoteMessage, undoAppendMessage } from "../features/notes/gateways/worker";
import type { MessageKey } from "./i18n";
import type { Environment } from "./environment";
import type { WorkerRegistry } from "./worker";
import { colors } from "#palette/colors";

// The review reminder's alarm and badge slot. Its rules (when to schedule, show and clear) are in
// features/notes/use-cases/reminder.ts. A higher badge priority wins when several features use the badge.
const REMINDER = "notes.reminder";
const REMINDER_PRIORITY = 10;
// The notice with an Undo button, built from src/content/append-notice.ts.
const APPEND_NOTICE = "content/append-notice.js";

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
  const indicator = environment.extension
    ? createBadgeReminderIndicator(createBadgeBoard(chrome.action, environment.driver).slot(REMINDER, REMINDER_PRIORITY), colors.badge.accent)
    : silentReminderIndicator;
  return {
    noteReminder: createNoteReminderDismissal({ indicator }),
    notes: environment.extension ? delegateImportToWorker(notes, createMessageClient(createChromeTransport(chrome.runtime))) : notes,
    noteChanges: createNoteChanges(environment.events),
  };
}

// Worker: the import message, "append selection" as a context menu item and a shortcut, the undo message
// sent by the page's notice, and the review reminder. The worker has no screen of its own, so results
// appear on the page; a failure also marks the tab's toolbar badge until the next success there.
export function registerNoteWorker(worker: WorkerRegistry) {
  const { driver, events } = worker.environment;
  const repository = createNoteStorage(driver);
  const notes = createNotes(driver);
  const appends = createNoteAppendApplication({ reader: createTabSelection(chrome.scripting), repository, history: createAppendHistory(driver) });
  const { t, language } = createChromeTranslator<MessageKey>(chrome.i18n);
  const tabBadge = createTabBadge(chrome.action);
  const toasts = createPageToasts(chrome.scripting, colors.notice);
  const scripts = createPageScripts(chrome.scripting);
  const reminders = createNoteReminderApplication({
    repository,
    schedule: createAlarmReminderSchedule(createAlarmScheduler(chrome.alarms), REMINDER),
    indicator: createBadgeReminderIndicator(worker.badges.slot(REMINDER, REMINDER_PRIORITY), colors.badge.accent),
  });
  const appendFailures: Record<AppendFailure, MessageKey> = { "no-selection": "toastNoSelection", "too-long": "toastTooLong" };

  async function report(tabId: number | undefined, append: () => Promise<unknown>) {
    try {
      await append();
      if (tabId === undefined) return;
      await tabBadge.clear(tabId);
      await scripts.run(tabId, APPEND_NOTICE);
    } catch (error) {
      const message = error instanceof NoteAppendError
        ? t(appendFailures[error.reason], new Intl.NumberFormat(language).format(MAX_NOTE_LENGTH))
        : t("toastAppendFailed");
      if (tabId !== undefined) {
        await tabBadge.show(tabId, "!", colors.badge.danger);
        await toasts.show(tabId, message, "error");
      }
      // Expected outcomes are shown to the user; anything else is also logged by the worker.
      if (!(error instanceof NoteAppendError)) throw error;
    }
  }

  worker.router.handle(importNoteMessage, (input) => notes.importNote(input));
  worker.router.handle(undoAppendMessage, (input) => appends.undoAppend(input));
  worker.menus.push({
    id: "notes.append-selection",
    title: t("contextMenuAppendSelection"),
    contexts: ["selection"],
    onClick: (click) => report(click.tabId, () => appends.appendNote({ text: click.selectionText ?? "" })),
  });
  // The key comes from `commands` in the manifest; Chrome grants activeTab for the tab it was pressed on.
  worker.commands.push({
    name: "append-selection",
    run: ({ tabId }) => report(tabId, () => tabId === undefined
      ? Promise.reject(new NoteAppendError("no-selection"))
      : appends.appendSelection({ tabId })),
  });

  // The worker hears every saved change (from any screen or itself) and fires the alarm when it comes.
  createNoteChanges(events).subscribe((note) => { void reminders.noteChanged(note).catch(worker.report); }, worker.report);
  worker.alarms.push({ name: REMINDER, run: () => reminders.remindReview(undefined) });
}
