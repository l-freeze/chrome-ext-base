import type { LoadNoteOutput, SaveNoteInput, StorageContract } from "../../../application/ports/storage";
import { saveNoteInput, storedNoteOutput } from "../../../validation/note-validation";

export const noteStorageContract: StorageContract<SaveNoteInput, LoadNoteOutput> = {
  key: "quick-note",
  input: saveNoteInput,
  output: storedNoteOutput,
  encode: (input) => input.text,
};
