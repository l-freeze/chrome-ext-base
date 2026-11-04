import type { CapturePreferences } from "../page";
import type { CapturePreferencesRepository } from "../ports";

export type SavePreferencesInput = CapturePreferences;
export type SavePreferencesOutput = CapturePreferences;
export type SavePreferences = (input: SavePreferencesInput) => Promise<SavePreferencesOutput>;

export function createSavePreferences(repository: CapturePreferencesRepository): SavePreferences {
  return async (input) => {
    await repository.save(input);
    return repository.load();
  };
}
