import type { NoteActions, NoteRepository, NoteSource } from "./ports";
import { createLoadNote } from "./use-cases/load";
import { createSaveNote } from "./use-cases/save";
import { createImportNote } from "./use-cases/import";
import { createAppendNote } from "./use-cases/append";
import { createLoadController } from "./controllers/load";
import { createSaveController } from "./controllers/save";
import { createImportController } from "./controllers/import";
import { createAppendController } from "./controllers/append";

export function createNoteApplication(dependencies: { repository: NoteRepository; source: NoteSource }): NoteActions {
  return {
    loadNote: createLoadController(createLoadNote(dependencies.repository)),
    saveNote: createSaveController(createSaveNote(dependencies.repository)),
    importNote: createImportController(createImportNote(dependencies.source, dependencies.repository)),
    appendNote: createAppendController(createAppendNote(dependencies.repository)),
  };
}
