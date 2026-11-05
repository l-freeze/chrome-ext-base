import type { BadgeSlot } from "../../../infrastructure/badge";
import type { ArrivalsIndicator } from "../ports";

// The count on the shared toolbar badge; larger numbers do not fit, so they are shown as 99+.
export function createBadgeIndicator(slot: BadgeSlot, color: string): ArrivalsIndicator {
  return {
    show: (count) => count > 0 ? slot.show(count > 99 ? "99+" : String(count), color) : slot.clear(),
  };
}

// The browser preview has no toolbar button.
export const silentIndicator: ArrivalsIndicator = { show: async () => {} };
