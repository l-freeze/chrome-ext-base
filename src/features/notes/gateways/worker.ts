import type { Note } from "../note";
import { noteText } from "../note";
import type { NoteActions } from "../ports";
import { ValidationError } from "../../../lib/validation";
import type { MessageContract } from "../../../infrastructure/messaging/contracts";
import type { MessageClient } from "../../../infrastructure/messaging/client";

// The worker validates the request with the import controller; this contract only carries it.
export const importNoteMessage: MessageContract<unknown, Note> = {
  type: "notes.import",
  request: { parse: (raw) => raw },
  response: { parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
      throw new ValidationError("取り込んだメモの形式が不正です。");
    }
    return { text: noteText(raw.text) };
  } },
};

// Runs the import in the service worker, so it completes even if the popup closes meanwhile.
export function delegateImportToWorker(actions: NoteActions, client: MessageClient): NoteActions {
  return { ...actions, importNote: (input) => client.request(importNoteMessage, input) };
}
