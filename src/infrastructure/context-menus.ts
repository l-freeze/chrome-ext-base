// Validated facts from a context menu click. Page-derived values are untrusted text.
export interface ContextMenuClick {
  selectionText: string | undefined;
  pageUrl: string | undefined;
  tabId: number | undefined;
}

export interface ContextMenuItem {
  id: string;
  title: string;
  contexts: [`${chrome.contextMenus.ContextType}`, ...`${chrome.contextMenus.ContextType}`[]];
  onClick(click: ContextMenuClick): Promise<void>;
}

type MenusApi = Pick<typeof chrome.contextMenus, "create" | "removeAll" | "onClicked">;
type InstalledEvent = Pick<typeof chrome.runtime.onInstalled, "addListener">;

// Menu items persist across worker restarts, so they are (re)created on install and update only.
// The click listener must still be registered at the worker's top level on every start.
export function registerContextMenus(menus: MenusApi, installed: InstalledEvent, items: readonly ContextMenuItem[], onError: (error: unknown) => void) {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new TypeError(`Context menu id "${item.id}" is duplicated.`);
    ids.add(item.id);
  }
  installed.addListener(() => {
    void menus.removeAll().then(() => {
      for (const item of items) menus.create({ id: item.id, title: item.title, contexts: item.contexts });
    }).catch(onError);
  });
  menus.onClicked.addListener((info, tab) => {
    const item = items.find((candidate) => candidate.id === info.menuItemId);
    if (!item) return;
    const tabId = tab?.id;
    void item.onClick({
      selectionText: typeof info.selectionText === "string" ? info.selectionText : undefined,
      pageUrl: typeof info.pageUrl === "string" ? info.pageUrl : undefined,
      tabId: typeof tabId === "number" && Number.isSafeInteger(tabId) && tabId >= 0 ? tabId : undefined,
    }).catch(onError);
  });
}
