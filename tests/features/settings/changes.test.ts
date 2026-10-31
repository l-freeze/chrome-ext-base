import { expect, it } from "vitest";
import { createChromeChanges } from "../../../src/infrastructure/storage/drivers/chrome";
import { createSettingsChanges } from "../../../src/features/settings/gateways/storage";
import { ValidationError } from "../../../src/lib/validation";
import { connectSettings } from "../../../src/ui/settings";
import type { Settings } from "../../../src/features/settings/settings";

function events() {
  const listeners = new Set<(value: Record<string, chrome.storage.StorageChange>, area: string) => void>();
  return {
    addListener: (listener: (value: Record<string, chrome.storage.StorageChange>, area: string) => void) => { listeners.add(listener); },
    removeListener: (listener: (value: Record<string, chrome.storage.StorageChange>, area: string) => void) => { listeners.delete(listener); },
    emit: (value: Record<string, chrome.storage.StorageChange>, area = "local") => { for (const listener of listeners) listener(value, area); },
  };
}

it("関連するストレージ変更だけを検証して通知し、解除後には通知しない", () => {
  const source = events();
  const changes = createSettingsChanges(createChromeChanges(source));
  const values: Settings[] = [];
  const errors: unknown[] = [];
  const stop = changes.subscribe((value) => values.push(value), (error) => errors.push(error));
  source.emit({ other: { newValue: 42 } });
  source.emit({ settings: { newValue: 42 } }, "sync");
  source.emit({ settings: { newValue: { version: 1, theme: "dark", includeSelection: false } } });
  source.emit({ settings: { newValue: { version: 1, theme: "bad", includeSelection: false } } });
  source.emit({ settings: {} });
  stop();
  source.emit({ settings: { newValue: 42 } });
  expect(values).toEqual([{ theme: "dark", includeSelection: false }, { theme: "system", includeSelection: true }]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toBeInstanceOf(ValidationError);
});

it("遅れた初期読込は新しい通知を上書きせず、破棄後も反映しない", async () => {
  const source = events();
  const changes = createSettingsChanges(createChromeChanges(source));
  let resolve!: (value: Settings) => void;
  const initial = new Promise<Settings>((done) => { resolve = done; });
  const values: Settings[] = [];
  const stop = connectSettings({ load: () => initial, save: () => initial, reset: () => initial }, changes,
    (value) => values.push(value), () => {});
  source.emit({ settings: { newValue: { version: 1, theme: "dark", includeSelection: false } } });
  resolve({ theme: "light", includeSelection: true });
  await initial;
  stop();
  source.emit({ settings: {} });
  expect(values).toEqual([{ theme: "dark", includeSelection: false }]);
});
