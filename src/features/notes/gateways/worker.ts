import type { Note } from "../note";
import { NoteImportError, noteText } from "../note";
import type { ImportFailure } from "../note";
import type { NoteActions } from "../ports";
import { ValidationError } from "../../../lib/validation";
import type { MessageContract } from "../../../infrastructure/messaging/contracts";
import type { MessageClient } from "../../../infrastructure/messaging/client";
import { MessageError } from "../../../infrastructure/messaging/contracts";

// The worker validates the request with the import controller; this contract only carries it.
export const importNoteMessage: MessageContract<unknown, Note> = {
  type: "notes.import",
  request: { parse: (raw) => raw },
  response: { parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
      throw new ValidationError("The worker returned an unexpected note.");
    }
    return { text: noteText(raw.text) };
  } },
};

const failures = new Set<ImportFailure>(["network", "timeout", "server", "response"]);

// Runs the import in the service worker, so it completes even if the popup closes meanwhile.
export function delegateImportToWorker(actions: NoteActions, client: MessageClient): NoteActions {
  return {
    ...actions,
    importNote: (input) => client.request(importNoteMessage, input).catch((error: unknown) => {
      if (error instanceof MessageError && error.remoteName === "NoteImportError" && failures.has(error.reason as ImportFailure)) {
        throw new NoteImportError(error.reason as ImportFailure, { cause: error });
      }
      throw error;
    }),
  };
}
