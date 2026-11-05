import { createEnvironment } from "./environment";
import { createMessageRouter } from "../infrastructure/messaging/router";
import { createBadgeBoard } from "../infrastructure/badge";
import type { ContextMenuItem } from "../infrastructure/context-menus";
import type { CommandItem } from "../infrastructure/commands";
import type { AlarmItem } from "../infrastructure/alarms";
import type { InstallTask } from "../infrastructure/lifecycle";
// @sample-begin
import { registerNoteWorker } from "./notes";
import { registerArrivalsWorker } from "./arrivals";
import { registerWelcomeWorker } from "./welcome";
// @sample-end

// Concrete implementations for the service worker. Each feature registers its messages, menu items,
// shortcuts, alarms and install tasks here.
export function createWorkerApplication() {
  const environment = createEnvironment();
  const router = createMessageRouter();
  const badges = createBadgeBoard(chrome.action, environment.driver);
  const menus: ContextMenuItem[] = [];
  const commands: CommandItem[] = [];
  const alarms: AlarmItem[] = [];
  const installs: InstallTask[] = [];
  // Failures in work no screen waits for (events, alarms) end up in the worker's console.
  const report = (error: unknown) => console.error("Service worker task failed.", error);
  const worker = { environment, router, badges, menus, commands, alarms, installs, report };
  // @sample-begin
  registerNoteWorker(worker);
  registerArrivalsWorker(worker);
  registerWelcomeWorker(worker);
  // @sample-end
  return worker;
}

export type WorkerRegistry = ReturnType<typeof createWorkerApplication>;
