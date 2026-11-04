import type { SettingsRepository, SettingsChanges } from "../ports";
import type { Settings } from "../settings";
import { defaultSettings, settingsTheme } from "../settings";
import { ValidationError } from "../../../lib/validation";
import type { KeyValueStorage, StorageContract, StorageChanges } from "../../../infrastructure/storage/contracts";
import { createTypedStorage } from "../../../infrastructure/storage/typed";

const contract: StorageContract<Settings, Settings> = {
  key: "settings",
  input: { parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("theme" in raw)) {
      throw new ValidationError("Settings to save must be { theme }.");
    }
    return { theme: settingsTheme(raw.theme) };
  } },
  output: { parse(raw) {
    if (raw === undefined) return defaultSettings();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        !("version" in raw) || raw.version !== 1 || !("theme" in raw)) {
      throw new ValidationError("Stored settings are not in a known format; reset them to the defaults.");
    }
    return { theme: settingsTheme(raw.theme) };
  } },
  encode: (input) => ({ version: 1, ...input }),
};

export function createSettingsStorage(driver: KeyValueStorage): SettingsRepository {
  const storage = createTypedStorage(driver, contract);
  return { ...storage, reset: () => storage.save(defaultSettings()) };
}

export function createSettingsChanges(changes: StorageChanges): SettingsChanges {
  return {
    subscribe(onValue, onError) {
      return changes.subscribe(contract.key, (raw) => {
        let value: Settings;
        try { value = contract.output.parse(raw); }
        catch (error) { onError(error); return; }
        onValue(value);
      }, onError);
    },
  };
}
