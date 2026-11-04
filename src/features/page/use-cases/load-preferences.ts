import type { CapturePreferences } from "../page";
import type { CapturePreferencesRepository } from "../ports";

export type LoadPreferencesInput = void;
export type LoadPreferencesOutput = CapturePreferences;
export type LoadPreferences = (input: LoadPreferencesInput) => Promise<LoadPreferencesOutput>;

export function createLoadPreferences(repository: CapturePreferencesRepository): LoadPreferences {
  return async (_input) => repository.load();
}
