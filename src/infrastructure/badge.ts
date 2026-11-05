import type { KeyValueStorage } from "./storage/contracts";

type ActionApi = Pick<typeof chrome.action, "setBadgeText" | "setBadgeBackgroundColor">;

// A badge on the toolbar button for one tab: a short status about something that happened there.
// It covers the shared badge (BadgeBoard) while that tab is active and goes away when the tab closes.
export interface TabBadge {
  show(tabId: number, text: string, color: string): Promise<void>;
  clear(tabId: number): Promise<void>;
}

export function createTabBadge(action: ActionApi): TabBadge {
  return {
    async show(tabId, text, color) {
      await action.setBadgeBackgroundColor({ tabId, color });
      await action.setBadgeText({ tabId, text });
    },
    // null (not "") removes the tab's own text, so the shared badge shows again.
    clear: (tabId) => action.setBadgeText({ tabId, text: null as unknown as string }),
  };
}

// The badge shared by every tab. Several features may want it at once (a count, a reminder), so each
// writes its own slot and the board shows the slot with the highest priority. Slots are kept in
// storage: the worker stops when idle, screens may clear a slot, and Chrome does not keep the badge
// across browser restarts, so the worker calls render() when it starts.
export interface BadgeSlot {
  show(text: string, color: string): Promise<void>;
  clear(): Promise<void>;
}

export interface BadgeBoard {
  slot(name: string, priority: number): BadgeSlot;
  render(): Promise<void>;
}

interface SlotValue { text: string; color: string; priority: number }

const KEY = "action-badge";

// Stored slots are checked one by one; a damaged entry is dropped instead of hiding the others.
function parseSlots(raw: unknown): Record<string, SlotValue> {
  const slots: Record<string, SlotValue> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return slots;
  for (const [name, value] of Object.entries(raw)) {
    if (
      typeof value === "object" && value !== null && typeof value.text === "string" && value.text !== "" &&
      typeof value.color === "string" && typeof value.priority === "number" && Number.isFinite(value.priority)
    ) slots[name] = { text: value.text, color: value.color, priority: value.priority };
  }
  return slots;
}

export function createBadgeBoard(action: ActionApi, driver: KeyValueStorage): BadgeBoard {
  async function paint(slots: Record<string, SlotValue>) {
    const top = Object.values(slots).sort((a, b) => b.priority - a.priority)[0];
    if (top) await action.setBadgeBackgroundColor({ color: top.color });
    await action.setBadgeText({ text: top?.text ?? "" });
  }
  // The badge is painted inside the key's lock, so a slower writer cannot paint an older state last.
  const change = (edit: (slots: Record<string, SlotValue>) => void) => driver.lock(KEY, async () => {
    const slots = parseSlots(await driver.get(KEY));
    edit(slots);
    await driver.set(KEY, slots);
    await paint(slots);
  });
  return {
    slot(name, priority) {
      if (!Number.isFinite(priority)) throw new RangeError(`Badge slot "${name}" needs a finite priority.`);
      return {
        async show(text, color) {
          if (text === "") throw new RangeError(`Badge slot "${name}" needs text; use clear() to hide it.`);
          await change((slots) => { slots[name] = { text, color, priority }; });
        },
        clear: () => change((slots) => { delete slots[name]; }),
      };
    },
    render: () => driver.lock(KEY, async () => paint(parseSlots(await driver.get(KEY)))),
  };
}
