import type { NoteSource } from "../../../application/ports/outbound/note-source";
import type { FetchNoteOutput } from "../../../application/contracts";
import { importNoteInput } from "../../../validation/commands";
import { fetchNoteOutput } from "../../../validation/note";

export function createMockNoteSource(notes: readonly FetchNoteOutput[]): NoteSource {
  const data = notes.map((note) => fetchNoteOutput.parse(note));
  return {
    async fetchNote(raw) {
      const input = importNoteInput.parse(raw);
      const note = data.find((item) => item.id === input.id);
      if (!note) throw new Error(`Note ${input.id} was not found.`);
      return { ...note };
    },
  };
}
