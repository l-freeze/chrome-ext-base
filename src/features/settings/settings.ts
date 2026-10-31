import { ValidationError } from "../../lib/validation";

export type Theme = "system" | "light" | "dark";
export interface Settings { theme: Theme; includeSelection: boolean }

export function defaultSettings(): Settings {
  return { theme: "system", includeSelection: true };
}

export function settingsTheme(raw: unknown): Theme {
  if (raw !== "system" && raw !== "light" && raw !== "dark") {
    throw new ValidationError("テーマを選択してください。");
  }
  return raw;
}
