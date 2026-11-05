import type { Note } from "../note";
import { appendText } from "../note";
import type { AppendHistory, NoteRepository } from "../ports";

export type AppendNoteInput = { text: string };
export type AppendNoteOutput = Note;
export type AppendNote = (input: AppendNoteInput) => Promise<AppendNoteOutput>;

// Append in one locked update, then remember what changed so the page's notice can undo it.
export async function appendAndRecord(repository: NoteRepository, history: AppendHistory, text: string): Promise<Note> {
  let before = "";
  const note = await repository.update((current) => { before = current.text; return appendText(current, text); });
  await history.save({ before, after: note.text });
  return note;
}

export function createAppendNote(repository: NoteRepository, history: AppendHistory): AppendNote {
  return (input) => appendAndRecord(repository, history, input.text);
}
