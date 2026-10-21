import type { FetchNoteOutput, NoteSource } from "../ports";
import { noteText } from "../note";

export function createMockNoteSource(notes: readonly FetchNoteOutput[]): NoteSource {
  const data = notes.map((note) => ({ id: note.id, text: noteText(note.text) }));
  return {
    async fetchNote(input) {
      const note = data.find((item) => item.id === input.id);
      if (!note) throw new Error(`Note ${input.id} was not found.`);
      return { ...note };
    },
  };
}
