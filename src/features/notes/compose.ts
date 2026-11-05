import type { NoteActions, NoteRepository, NoteSelectionActions, NoteSource, SelectionReader } from "./ports";
import { createLoadNote } from "./use-cases/load";
import { createSaveNote } from "./use-cases/save";
import { createImportNote } from "./use-cases/import";
import { createAppendNote } from "./use-cases/append";
import { createAppendSelection } from "./use-cases/append-selection";
import { createLoadController } from "./controllers/load";
import { createSaveController } from "./controllers/save";
import { createImportController } from "./controllers/import";
import { createAppendController } from "./controllers/append";
import { createAppendSelectionController } from "./controllers/append-selection";

export function createNoteApplication(dependencies: { repository: NoteRepository; source: NoteSource }): NoteActions {
  return {
    loadNote: createLoadController(createLoadNote(dependencies.repository)),
    saveNote: createSaveController(createSaveNote(dependencies.repository)),
    importNote: createImportController(createImportNote(dependencies.source, dependencies.repository)),
    appendNote: createAppendController(createAppendNote(dependencies.repository)),
  };
}

// Worker-only operations that read the active tab; screens do not need them.
export function createNoteSelectionApplication(dependencies: { reader: SelectionReader; repository: NoteRepository }): NoteSelectionActions {
  return { appendSelection: createAppendSelectionController(createAppendSelection(dependencies.reader, dependencies.repository)) };
}
