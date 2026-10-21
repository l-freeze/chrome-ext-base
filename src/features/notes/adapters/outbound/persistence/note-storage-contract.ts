import type { LoadNoteOutput, SaveNoteInput } from "../../../application/contracts";
import type { StorageContract } from "../../../../../infrastructure/storage/storage-contract";
import { saveNoteInput } from "../../../validation/commands";
import { noteText } from "../../../validation/note";

// Only this adapter owns the persisted representation and key.
export const noteStorageContract: StorageContract<SaveNoteInput, LoadNoteOutput> = {
  key: "quick-note",
  input: saveNoteInput,
  output: { parse(input) { return { text: input === undefined ? "" : noteText(input) }; } },
  encode: (input) => input.text,
};
