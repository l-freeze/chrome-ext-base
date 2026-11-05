import type { Note } from "../note";
import { undoAppend } from "../note";
import type { AppendHistory, NoteRepository } from "../ports";

export type UndoAppendInput = void;
export type UndoAppendOutput = Note;
export type UndoAppend = (input: UndoAppendInput) => Promise<UndoAppendOutput>;

// Restore the note from before the last append, then forget the record so it is undone once.
export function createUndoAppend(repository: NoteRepository, history: AppendHistory): UndoAppend {
  return async () => {
    const record = await history.load();
    const note = await repository.update((current) => undoAppend(current, record));
    await history.save(null);
    return note;
  };
}
