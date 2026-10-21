import type { ImportNoteInput, FetchNoteOutput } from "../../contracts";

export interface NoteSource {
  fetchNote(input: ImportNoteInput): Promise<FetchNoteOutput>;
}
