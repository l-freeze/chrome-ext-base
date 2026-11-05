import { listenChromeMessages } from "../infrastructure/messaging/drivers/chrome";
import { registerContextMenus } from "../infrastructure/context-menus";
import { registerCommands } from "../infrastructure/commands";
import { createWorkerApplication } from "../composition/worker";

// Call synchronously at the top level of the worker entry. Chrome only delivers the event that
// woke a restarted worker to listeners registered during its first turn. Keep no state in variables:
// the worker stops when idle, so persistent state belongs in chrome.storage.
export function startWorker() {
  const application = createWorkerApplication();
  const report = (error: unknown) => console.error("Service worker task failed.", error);
  listenChromeMessages(chrome.runtime, application.router);
  // The contextMenus API exists only with its permission, which a build without menu items can omit.
  if (application.menus.length > 0) registerContextMenus(chrome.contextMenus, chrome.runtime.onInstalled, application.menus, report);
  // Shortcuts also need their names declared under `commands` in the manifest.
  if (application.commands.length > 0) registerCommands(chrome.commands, application.commands, report);
}
