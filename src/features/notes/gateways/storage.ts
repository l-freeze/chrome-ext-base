import type { NoteRepository } from "../ports";
import type { Note } from "../note";
import { noteText } from "../note";
import { ValidationError } from "../../../lib/validation";
import type { KeyValueStorage, StorageContract } from "../../../infrastructure/storage/contracts";
import { createTypedStorage } from "../../../infrastructure/storage/typed";

// Storage has its own boundary contract; it does not reuse a controller's input schema.
const contract: StorageContract<Note, Note> = {
  key: "quick-note",
  input: { parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
      throw new ValidationError("保存するメモの形式が不正です。");
    }
    return { text: noteText(raw.text) };
  } },
  output: { parse(raw) { return { text: raw === undefined ? "" : noteText(raw) }; } },
  encode: (input) => input.text,
};

export function createNoteStorage(driver: KeyValueStorage): NoteRepository {
  return createTypedStorage(driver, contract);
}
