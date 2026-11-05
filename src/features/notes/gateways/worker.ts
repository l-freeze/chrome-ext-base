import type { Note } from "../note";
import { NoteImportError, NoteUndoError, noteText } from "../note";
import type { ImportFailure, UndoFailure } from "../note";
import type { NoteActions } from "../ports";
import { ValidationError } from "../../../lib/validation";
import type { MessageContract } from "../../../infrastructure/messaging/contracts";
import type { MessageClient } from "../../../infrastructure/messaging/client";
import { MessageError } from "../../../infrastructure/messaging/contracts";

const noteResponse = { parse(raw: unknown): Note {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
    throw new ValidationError("The worker returned an unexpected note.");
  }
  return { text: noteText(raw.text) };
} };

// The worker validates the request with the import controller; this contract only carries it.
export const importNoteMessage: MessageContract<unknown, Note> = {
  type: "notes.import",
  request: { parse: (raw) => raw },
  response: noteResponse,
};

// Sent by the page's notice (a content script) after an append. The undo controller checks the input.
export const undoAppendMessage: MessageContract<unknown, Note> = {
  type: "notes.undoAppend",
  request: { parse: (raw) => raw },
  response: noteResponse,
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

const undoFailures = new Set<UndoFailure>(["nothing", "changed"]);

// For the content script: asks the worker to undo and rebuilds the reason the notice words.
export function requestUndoAppend(client: MessageClient): Promise<Note> {
  return client.request(undoAppendMessage, undefined).catch((error: unknown) => {
    if (error instanceof MessageError && error.remoteName === "NoteUndoError" && undoFailures.has(error.reason as UndoFailure)) {
      throw new NoteUndoError(error.reason as UndoFailure);
    }
    throw error;
  });
}
