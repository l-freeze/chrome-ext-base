import { ValidationError } from "../../lib/validation";

export type Theme = "system" | "light" | "dark";
// Base settings shared by every screen. Feature-specific preferences belong to their feature.
export interface Settings { theme: Theme }

export function defaultSettings(): Settings {
  return { theme: "system" };
}

export function settingsTheme(raw: unknown): Theme {
  if (raw !== "system" && raw !== "light" && raw !== "dark") {
    throw new ValidationError("テーマを選択してください。");
  }
  return raw;
}
