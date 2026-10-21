import type { ImportNoteInput, LoadNoteOutput, SaveNoteInput } from "../contracts";

// Internal operations receive only validated input from an inbound adapter.
export interface NoteUseCases {
  loadNote(input: void): Promise<LoadNoteOutput>;
  saveNote(input: SaveNoteInput): Promise<LoadNoteOutput>;
  importNote(input: ImportNoteInput): Promise<LoadNoteOutput>;
}
