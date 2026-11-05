import { listenChromeMessages } from "../infrastructure/messaging/drivers/chrome";
import { registerContextMenus } from "../infrastructure/context-menus";
import { registerCommands } from "../infrastructure/commands";
import { registerAlarms } from "../infrastructure/alarms";
import { registerInstallTasks } from "../infrastructure/lifecycle";
import { createWorkerApplication } from "../composition/worker";

// Call synchronously at the top level of the worker entry. Chrome only delivers the event that
// woke a restarted worker to listeners registered during its first turn. Keep no state in variables:
// the worker stops when idle, so persistent state belongs in chrome.storage.
export function startWorker() {
  const application = createWorkerApplication();
  const { report } = application;
  listenChromeMessages(chrome.runtime, application.router);
  // The contextMenus and alarms APIs exist only with their permissions, which a build without items can omit.
  if (application.menus.length > 0) registerContextMenus(chrome.contextMenus, chrome.runtime.onInstalled, application.menus, report);
  // Shortcuts also need their names declared under `commands` in the manifest.
  if (application.commands.length > 0) registerCommands(chrome.commands, application.commands, report);
  if (application.alarms.length > 0) registerAlarms(chrome.alarms, chrome.runtime, application.alarms, report);
  if (application.installs.length > 0) registerInstallTasks(chrome.runtime.onInstalled, application.installs, report);
  // Chrome does not keep the shared badge across browser restarts; paint it from storage on every start.
  void application.badges.render().catch(report);
}
