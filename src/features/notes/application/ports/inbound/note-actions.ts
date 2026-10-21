import type { LoadNoteOutput } from "../../contracts";

// Public boundary: implementations must validate raw input before invoking UseCases.
export interface NoteActions {
  loadNote(input: unknown): Promise<LoadNoteOutput>;
  saveNote(input: unknown): Promise<LoadNoteOutput>;
  importNote(input: unknown): Promise<LoadNoteOutput>;
}
