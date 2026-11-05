import { ValidationError } from "../../lib/validation";

export type Theme = "system" | "light" | "dark";
// Base settings shared by every screen. Feature-specific preferences belong to their feature.
export interface Settings { theme: Theme }

export function defaultSettings(): Settings {
  return { theme: "system" };
}

export function settingsTheme(raw: unknown): Theme {
  if (raw !== "system" && raw !== "light" && raw !== "dark") {
    throw new ValidationError("Theme must be system, light, or dark.");
  }
  return raw;
}

// A file a user can keep and load back. The format name and version let a later release recognize and
// convert older backups; the settings inside keep the same rules as saved settings.
export const SETTINGS_BACKUP_FORMAT = "chrome-ext-base/settings";
export interface SettingsBackup { format: typeof SETTINGS_BACKUP_FORMAT; version: 1; settings: Settings }

export function toBackup(settings: Settings): SettingsBackup {
  return { format: SETTINGS_BACKUP_FORMAT, version: 1, settings: { ...settings } };
}
