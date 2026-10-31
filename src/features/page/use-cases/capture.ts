import type { PageInfo } from "../page";
import type { CapturePreferences, PageReader } from "../ports";

export type CaptureInput = void;
export type CaptureOutput = PageInfo;
export type CapturePage = (input: CaptureInput) => Promise<CaptureOutput>;

export function createCapturePage(reader: PageReader, preferences: CapturePreferences): CapturePage {
  return async (_input) => {
    const settings = await preferences.load();
    return reader.read({ includeSelection: settings.includeSelection });
  };
}
