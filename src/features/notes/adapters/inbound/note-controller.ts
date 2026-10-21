import type { NoteActions } from "../../application/ports/inbound/note-actions";
import type { NoteUseCases } from "../../application/use-cases/types";
import { importNoteInput, saveNoteInput } from "../../validation/commands";
import { noInput } from "../../../../shared/validation/primitives";
import { validatedAction } from "../../../../shared/validation/validated-action";

export function createNoteController(useCases: NoteUseCases): NoteActions {
  return {
    loadNote: validatedAction(noInput, useCases.loadNote),
    saveNote: validatedAction(saveNoteInput, useCases.saveNote),
    importNote: validatedAction(importNoteInput, useCases.importNote),
  };
}
