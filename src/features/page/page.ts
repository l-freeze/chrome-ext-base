// Whether a capture includes the selected text. Owned by this feature, not by the base settings.
export interface CapturePreferences { includeSelection: boolean }

export function defaultCapturePreferences(): CapturePreferences {
  return { includeSelection: true };
}

export interface PageInfo {
  title: string;
  url: string;
  selection: string;
  selectionTruncated: boolean;
}

// Why a capture could not run. The UI chooses the wording for each reason.
export type CaptureFailure = "unsupported-page" | "blocked";

export class PageCaptureError extends Error {
  override name = "PageCaptureError";
  constructor(public readonly reason: CaptureFailure) {
    super(`Page capture failed: ${reason}`);
  }
}
