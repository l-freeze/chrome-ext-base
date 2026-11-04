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
