import type { Settings } from "../settings";
import type { SettingsRepository } from "../ports";

export type SaveSettingsInput = Settings;
export type SaveSettingsOutput = Settings;
export type SaveSettings = (input: SaveSettingsInput) => Promise<SaveSettingsOutput>;

export function createSaveSettings(repository: SettingsRepository): SaveSettings {
  return async (input) => {
    await repository.save(input);
    return repository.load();
  };
}
