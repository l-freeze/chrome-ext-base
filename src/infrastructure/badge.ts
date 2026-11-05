// The toolbar button's badge: a short status the worker can show without any open screen.
export interface ActionBadge {
  show(text: string, color: string): Promise<void>;
  clear(): Promise<void>;
}

export function createActionBadge(action: Pick<typeof chrome.action, "setBadgeText" | "setBadgeBackgroundColor">): ActionBadge {
  return {
    async show(text, color) {
      await action.setBadgeBackgroundColor({ color });
      await action.setBadgeText({ text });
    },
    clear: () => action.setBadgeText({ text: "" }),
  };
}
