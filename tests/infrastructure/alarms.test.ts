import { expect, it } from "vitest";
import type { AlarmItem, AlarmRun } from "../../src/infrastructure/alarms";
import { createAlarmScheduler, registerAlarms } from "../../src/infrastructure/alarms";

function api(existing: Record<string, { periodInMinutes?: number }> = {}) {
  const listeners: Record<string, Array<(value?: unknown) => void>> = { installed: [], startup: [], alarm: [] };
  const created: Array<{ name: string; info: chrome.alarms.AlarmCreateInfo }> = [];
  const alarms = {
    get: async (name: string) => existing[name] ? { name, scheduledTime: 0, persistAcrossSessions: false, ...existing[name] } : undefined,
    create: async (name: string, info: chrome.alarms.AlarmCreateInfo) => { created.push({ name, info }); },
    clear: async () => true,
    onAlarm: { addListener: (l: (value?: unknown) => void) => listeners.alarm!.push(l) },
  };
  const runtime = {
    onInstalled: { addListener: (l: (value?: unknown) => void) => listeners.installed!.push(l) },
    onStartup: { addListener: (l: (value?: unknown) => void) => listeners.startup!.push(l) },
  };
  const fire = (event: string, value?: unknown) => listeners[event]!.forEach((l) => l(value));
  return { alarms, runtime, created, fire, listeners };
}
const settle = () => new Promise((resolve) => setTimeout(resolve));
const item = (name: string, runs: AlarmRun[], options: Partial<AlarmItem> = {}): AlarmItem => ({ name, run: async (alarm) => { runs.push(alarm); }, ...options });

it("繰り返しのアラームをインストール時と起動時に作り、同じ周期で既にあれば作り直さない", async () => {
  const chrome = api({ same: { periodInMinutes: 30 }, changed: { periodInMinutes: 5 } });
  registerAlarms(chrome.alarms as never, chrome.runtime as never, [
    item("new", [], { periodInMinutes: 30, firstDelayInMinutes: 1 }),
    item("same", [], { periodInMinutes: 30 }),
    item("changed", [], { periodInMinutes: 30 }),
    item("once", []),
  ], (error) => { throw error; });
  chrome.fire("installed");
  await settle();
  expect(chrome.created).toEqual([
    { name: "new", info: { periodInMinutes: 30, delayInMinutes: 1 } },
    { name: "changed", info: { periodInMinutes: 30, delayInMinutes: 30 } },
  ]);
  chrome.fire("startup");
  await settle();
  expect(chrome.created.map((entry) => entry.name)).toEqual(["new", "changed", "new", "changed"]);
});

it("鳴ったアラームを名前で振り分け、失敗を通知する", async () => {
  const chrome = api();
  const runs: AlarmRun[] = [];
  const errors: unknown[] = [];
  const failure = new Error("Failed");
  registerAlarms(chrome.alarms as never, chrome.runtime as never, [item("a", runs), { name: "b", run: async () => { throw failure; } }], (error) => errors.push(error));
  chrome.fire("alarm", { name: "a", scheduledTime: 5 });
  chrome.fire("alarm", { name: "unknown", scheduledTime: 6 });
  chrome.fire("alarm", { name: "b", scheduledTime: 7 });
  await settle();
  expect(runs).toEqual([{ name: "a", scheduledTime: 5 }]);
  expect(errors).toEqual([failure]);
  // Without repeating alarms there is nothing to create on install.
  expect(chrome.listeners.installed).toHaveLength(0);
});

it("名前の重複と、Chrome が受け付けない短い間隔を登録時に拒否する", () => {
  const chrome = api();
  const register = (items: AlarmItem[]) => registerAlarms(chrome.alarms as never, chrome.runtime as never, items, () => {});
  expect(() => register([item("x", []), item("x", [])])).toThrow(TypeError);
  expect(() => register([item("x", [], { periodInMinutes: 0.1 })])).toThrow(RangeError);
  expect(() => register([item("x", [], { firstDelayInMinutes: 1 })])).toThrow(TypeError);
});

it("一度だけのアラームを予約・取り消しし、短すぎる予約は拒否する", async () => {
  const chrome = api();
  const scheduler = createAlarmScheduler(chrome.alarms as never);
  await scheduler.schedule("remind", 60);
  await scheduler.cancel("remind");
  expect(chrome.created).toEqual([{ name: "remind", info: { delayInMinutes: 60 } }]);
  await expect(scheduler.schedule("remind", 0)).rejects.toBeInstanceOf(RangeError);
});
