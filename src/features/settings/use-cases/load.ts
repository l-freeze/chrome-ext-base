import type { Settings } from "../settings";
import type { SettingsRepository } from "../ports";

export type LoadSettingsInput = void;
export type LoadSettingsOutput = Settings;
export type LoadSettings = (input: LoadSettingsInput) => Promise<LoadSettingsOutput>;

export function createLoadSettings(repository: SettingsRepository): LoadSettings {
  return async (_input) => {
    return repository.load();
  };
}
