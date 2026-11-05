import type { Settings, SettingsBackup } from "./settings";

export interface SettingsActions {
  load(input: unknown): Promise<Settings>;
  save(input: unknown): Promise<Settings>;
  reset(input: unknown): Promise<Settings>;
  exportBackup(input: unknown): Promise<SettingsBackup>;
  importBackup(input: unknown): Promise<Settings>;
}

export interface SettingsRepository {
  load(): Promise<Settings>;
  save(input: Settings): Promise<void>;
  reset(): Promise<void>;
}

// UI event subscription, independent of sequential UseCases.
export interface SettingsChanges {
  subscribe(onValue: (value: Settings) => void, onError: (error: unknown) => void): () => void;
}
