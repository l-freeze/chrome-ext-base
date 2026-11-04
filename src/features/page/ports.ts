import type { CapturePreferences, PageInfo } from "./page";

export interface PageActions {
  capture(input: unknown): Promise<PageInfo>;
  loadPreferences(input: unknown): Promise<CapturePreferences>;
  savePreferences(input: unknown): Promise<CapturePreferences>;
}
export interface PageReader { read(input: CapturePreferences): Promise<PageInfo> }
export interface CapturePreferencesRepository {
  load(): Promise<CapturePreferences>;
  save(input: CapturePreferences): Promise<void>;
}
