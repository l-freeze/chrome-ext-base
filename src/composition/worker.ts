import { createEnvironment } from "./environment";
import { createMessageRouter } from "../infrastructure/messaging/router";
import type { ContextMenuItem } from "../infrastructure/context-menus";
import type { CommandItem } from "../infrastructure/commands";
// @sample-begin
import { registerNoteWorker } from "./notes";
// @sample-end

// Concrete implementations for the service worker. Each feature registers its messages and menu items here.
export function createWorkerApplication() {
  const { driver } = createEnvironment();
  const router = createMessageRouter();
  const menus: ContextMenuItem[] = [];
  const commands: CommandItem[] = [];
  // @sample-begin
  registerNoteWorker({ driver, router, menus, commands });
  // @sample-end
  return { driver, router, menus, commands };
}
