import type { AppendHistory, NoteChanges, NoteRepository } from "../ports";
import type { AppendRecord, Note } from "../note";
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

function parseRecord(raw: unknown): AppendRecord | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw) || !("before" in raw) || !("after" in raw)) {
    throw new ValidationError("An append record must be { before, after }.");
  }
  return { before: noteText(raw.before), after: noteText(raw.after) };
}

const historyContract: StorageContract<AppendRecord | null, AppendRecord | null> = {
  key: "quick-note-last-append",
  input: { parse: parseRecord },
  output: { parse: parseRecord },
  encode: (input) => input,
};

export function createAppendHistory(driver: KeyValueStorage): AppendHistory {
  return createTypedStorage(driver, historyContract);
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
