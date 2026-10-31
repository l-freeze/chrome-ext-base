import type { Settings } from "../settings";
import type { SettingsRepository } from "../ports";

export type ResetSettingsInput = { confirmed: true };
export type ResetSettingsOutput = Settings;
export type ResetSettings = (input: ResetSettingsInput) => Promise<ResetSettingsOutput>;

export function createResetSettings(repository: SettingsRepository): ResetSettings {
  return async (_input) => {
    await repository.reset();
    return repository.load();
  };
}
