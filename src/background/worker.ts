import { listenChromeMessages } from "../infrastructure/messaging/drivers/chrome";
import { registerContextMenus } from "../infrastructure/context-menus";
import { createWorkerApplication } from "../composition/worker";

// Call synchronously at the top level of the worker entry. Chrome only delivers the event that
// woke a restarted worker to listeners registered during its first turn. Keep no state in variables:
// the worker stops when idle, so persistent state belongs in chrome.storage.
export function startWorker() {
  const application = createWorkerApplication();
  const report = (error: unknown) => console.error("Service worker task failed.", error);
  listenChromeMessages(chrome.runtime, application.router);
  registerContextMenus(chrome.contextMenus, chrome.runtime.onInstalled, application.menus, report);
}
