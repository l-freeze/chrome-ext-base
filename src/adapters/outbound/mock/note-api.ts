import type { FetchNoteOutput, NoteApi } from "../../../application/ports/note-api";
import { fetchNoteInput, fetchNoteOutput } from "../../../validation/note-validation";

export function createMockNoteApi(notes: readonly FetchNoteOutput[]): NoteApi {
  const data = notes.map((note) => fetchNoteOutput.parse(note));
  return {
    async fetchNote(raw) {
      const input = fetchNoteInput.parse(raw);
      const note = data.find((item) => item.id === input.id);
      if (!note) throw new Error(`Note ${input.id} was not found.`);
      return { ...note };
    },
  };
}
