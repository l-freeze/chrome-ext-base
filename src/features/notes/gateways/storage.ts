import type { NoteChanges, NoteRepository } from "../ports";
import type { Note } from "../note";
import { noteText } from "../note";
import { ValidationError } from "../../../lib/validation";
import type { KeyValueStorage, StorageChanges, StorageContract } from "../../../infrastructure/storage/contracts";
import { createTypedStorage } from "../../../infrastructure/storage/typed";

// Storage has its own boundary contract; it does not reuse a controller's input schema.
const contract: StorageContract<Note, Note> = {
  key: "quick-note",
  input: { parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
      throw new ValidationError("A note to save must be { text }.");
    }
    return { text: noteText(raw.text) };
  } },
  output: { parse(raw) { return { text: raw === undefined ? "" : noteText(raw) }; } },
  encode: (input) => input.text,
};

export function createNoteStorage(driver: KeyValueStorage): NoteRepository {
  return createTypedStorage(driver, contract);
}

export function createNoteChanges(changes: StorageChanges): NoteChanges {
  return {
    subscribe(onValue, onError) {
      return changes.subscribe(contract.key, (raw) => {
        let value: Note;
        try { value = contract.output.parse(raw); }
        catch (error) { onError(error); return; }
        onValue(value);
      }, onError);
    },
  };
}
