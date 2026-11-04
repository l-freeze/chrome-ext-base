import type { PageInfo } from "../page";
import type { CapturePreferencesRepository, PageReader } from "../ports";

export type CaptureInput = void;
export type CaptureOutput = PageInfo;
export type CapturePage = (input: CaptureInput) => Promise<CaptureOutput>;

export function createCapturePage(reader: PageReader, preferences: CapturePreferencesRepository): CapturePage {
  return async (_input) => {
    const current = await preferences.load();
    return reader.read(current);
  };
}
