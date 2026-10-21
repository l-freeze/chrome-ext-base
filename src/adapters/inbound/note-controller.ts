import type { FetchNoteInput } from "../../application/ports/note-api";
import type { LoadNoteOutput, SaveNoteInput } from "../../application/ports/storage";
import { fetchNoteInput, noInput, saveNoteInput } from "../../validation/note-validation";
import { validatedAction } from "../../validation/validated-action";

interface NoteUseCases {
  loadNote(input: void): Promise<LoadNoteOutput>;
  saveNote(input: SaveNoteInput): Promise<LoadNoteOutput>;
  importNote(input: FetchNoteInput): Promise<LoadNoteOutput>;
}

export function createNoteController(useCases: NoteUseCases) {
  return {
    loadNote: validatedAction(noInput, useCases.loadNote),
    saveNote: validatedAction(saveNoteInput, useCases.saveNote),
    importNote: validatedAction(fetchNoteInput, useCases.importNote),
  };
}

export type NoteController = ReturnType<typeof createNoteController>;
