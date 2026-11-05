// Timers for the service worker. The worker stops when idle, so setTimeout and setInterval do not
// survive; chrome.alarms wakes it instead. Like other events, onAlarm must be registered at the
// worker's top level so the alarm that woke a restarted worker reaches it.
export interface AlarmRun {
  name: string;
  scheduledTime: number;
}

export interface AlarmItem {
  name: string;
  // Repeating alarms are (re)created on install, update and browser start. Omit both for an alarm the
  // feature schedules itself with createAlarmScheduler. Chrome runs alarms at most every 30 seconds.
  periodInMinutes?: number;
  firstDelayInMinutes?: number;   // the first run after install; defaults to periodInMinutes
  run(alarm: AlarmRun): Promise<void>;
}

type AlarmsApi = Pick<typeof chrome.alarms, "get" | "create" | "onAlarm">;
type Lifecycle = {
  onInstalled: Pick<typeof chrome.runtime.onInstalled, "addListener">;
  onStartup: Pick<typeof chrome.runtime.onStartup, "addListener">;
};

const MIN_MINUTES = 0.5;

export function registerAlarms(alarms: AlarmsApi, runtime: Lifecycle, items: readonly AlarmItem[], onError: (error: unknown) => void) {
  const names = new Set<string>();
  for (const item of items) {
    if (names.has(item.name)) throw new TypeError(`Alarm "${item.name}" is duplicated.`);
    names.add(item.name);
    for (const minutes of [item.periodInMinutes, item.firstDelayInMinutes]) {
      if (minutes !== undefined && !(Number.isFinite(minutes) && minutes >= MIN_MINUTES)) {
        throw new RangeError(`Alarm "${item.name}" needs at least ${MIN_MINUTES} minutes.`);
      }
    }
    if (item.firstDelayInMinutes !== undefined && item.periodInMinutes === undefined) {
      throw new TypeError(`Alarm "${item.name}" has a first delay but no period.`);
    }
  }
  const repeating = items.filter((item) => item.periodInMinutes !== undefined);
  // Chrome keeps alarms while the worker sleeps, but may drop them on update or browser restart.
  // An alarm that already exists with the same period keeps its schedule.
  const ensure = () => {
    for (const item of repeating) {
      const periodInMinutes = item.periodInMinutes!;
      void alarms.get(item.name).then((existing) => {
        if (existing?.periodInMinutes === periodInMinutes) return;
        return alarms.create(item.name, { periodInMinutes, delayInMinutes: item.firstDelayInMinutes ?? periodInMinutes });
      }).catch(onError);
    }
  };
  if (repeating.length > 0) {
    runtime.onInstalled.addListener(ensure);
    runtime.onStartup.addListener(ensure);
  }
  alarms.onAlarm.addListener((alarm) => {
    const item = items.find((candidate) => candidate.name === alarm.name);
    if (!item) return;
    void item.run({ name: alarm.name, scheduledTime: alarm.scheduledTime }).catch(onError);
  });
}

// One-shot alarms a feature sets and cancels, e.g. "remind me an hour after the last change".
// Scheduling a name that is already set replaces it. Register the same name with registerAlarms.
export interface AlarmScheduler {
  schedule(name: string, delayInMinutes: number): Promise<void>;
  cancel(name: string): Promise<void>;
}

export function createAlarmScheduler(alarms: Pick<typeof chrome.alarms, "create" | "clear">): AlarmScheduler {
  return {
    async schedule(name, delayInMinutes) {
      if (!(Number.isFinite(delayInMinutes) && delayInMinutes >= MIN_MINUTES)) {
        throw new RangeError(`Alarm "${name}" needs at least ${MIN_MINUTES} minutes.`);
      }
      await alarms.create(name, { delayInMinutes });
    },
    async cancel(name) { await alarms.clear(name); },
  };
}
