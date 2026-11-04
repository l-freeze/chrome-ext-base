import type { ImportFailure } from "../note";
import { NoteImportError } from "../note";
import { HttpError, TransportError } from "../../../infrastructure/http";

// Maps what went wrong while fetching a note into the feature's reasons. Aborts pass through unchanged.
export function importFailure(error: unknown): unknown {
  if (error instanceof NoteImportError) return error;
  let reason: ImportFailure;
  if (error instanceof TransportError) {
    if (error.kind === "aborted") return error;
    reason = error.kind;
  } else if (error instanceof HttpError) {
    reason = error.status >= 500 || error.status === 429 || error.status === 408 ? "server" : "response";
  } else {
    reason = "response";   // invalid data or JSON from the service
  }
  return new NoteImportError(reason, { cause: error });
}
