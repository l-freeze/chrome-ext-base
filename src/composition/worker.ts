import { createChromeStorage } from "../infrastructure/storage/drivers/chrome";
import { createMessageRouter } from "../infrastructure/messaging/router";
import type { ContextMenuItem } from "../infrastructure/context-menus";
// @sample-begin
import { registerNoteWorker } from "./notes";
// @sample-end

// Concrete implementations for the service worker. Each feature registers its messages and menu items here.
export function createWorkerApplication() {
  const driver = createChromeStorage(chrome.storage.local);
  const router = createMessageRouter();
  const menus: ContextMenuItem[] = [];
  // @sample-begin
  registerNoteWorker(driver, router, menus);
  // @sample-end
  return { driver, router, menus };
}
