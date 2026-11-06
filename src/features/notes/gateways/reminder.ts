import type { ReminderIndicator, ReminderSchedule } from "../ports";
import type { AlarmScheduler } from "../../../infrastructure/alarms";
import type { BadgeSlot } from "../../../infrastructure/badge";

// One named one-shot alarm; scheduling again replaces it. The worker registers the same name to fire it.
export function createAlarmReminderSchedule(scheduler: AlarmScheduler, name: string): ReminderSchedule {
  return {
    schedule: (delayMinutes) => scheduler.schedule(name, delayMinutes),
    cancel: () => scheduler.cancel(name),
  };
}

export function createBadgeReminderIndicator(slot: BadgeSlot, color: string): ReminderIndicator {
  return { show: () => slot.show("●", color), clear: () => slot.clear() };
}

// The browser preview has no toolbar button.
export const silentReminderIndicator: ReminderIndicator = { show: async () => {}, clear: async () => {} };
