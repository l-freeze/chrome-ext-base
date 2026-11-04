import type { Settings } from "../features/settings/settings";
import type { SettingsActions, SettingsChanges } from "../features/settings/ports";
import { connectLive } from "./live";

export function applyTheme(settings: Settings) {
  if (settings.theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = settings.theme === "dark" ? "notebook-dark" : "notebook";
}

export function connectSettings(
  actions: SettingsActions, changes: SettingsChanges,
  onValue: (settings: Settings, changed: boolean) => void, onError: (error: unknown) => void,
): () => void {
  return connectLive(() => actions.load(undefined), (value, error) => changes.subscribe(value, error), onValue, onError);
}
