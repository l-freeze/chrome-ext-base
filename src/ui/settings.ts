import type { Settings } from "../features/settings/settings";
import type { SettingsActions, SettingsChanges } from "../features/settings/ports";

export function applyTheme(settings: Settings) {
  if (settings.theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = settings.theme === "dark" ? "notebook-dark" : "notebook";
}

// Subscribe before reading; a late initial read must not overwrite a newer event.
export function connectSettings(
  actions: SettingsActions, changes: SettingsChanges,
  onValue: (settings: Settings, changed: boolean) => void, onError: (error: unknown) => void,
): () => void {
  let active = true;
  let revision = 0;
  const stop = changes.subscribe((value) => {
    revision++;
    if (active) onValue(value, true);
  }, (error) => {
    revision++;
    if (active) onError(error);
  });
  const initial = revision;
  void actions.load(undefined).then((value) => {
    if (active && revision === initial) onValue(value, false);
  }, (error: unknown) => {
    if (active && revision === initial) onError(error);
  });
  return () => { active = false; stop(); };
}
