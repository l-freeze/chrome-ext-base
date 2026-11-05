import type { AppendHistory, NoteActions, NoteAppendActions, NoteRepository, NoteSource, SelectionReader } from "./ports";
import { createLoadNote } from "./use-cases/load";
import { createSaveNote } from "./use-cases/save";
import { createImportNote } from "./use-cases/import";
import { createAppendNote } from "./use-cases/append";
import { createAppendSelection } from "./use-cases/append-selection";
import { createUndoAppend } from "./use-cases/undo-append";
import { createLoadController } from "./controllers/load";
import { createSaveController } from "./controllers/save";
import { createImportController } from "./controllers/import";
import { createAppendController } from "./controllers/append";
import { createAppendSelectionController } from "./controllers/append-selection";
import { createUndoAppendController } from "./controllers/undo-append";

export function createNoteApplication(dependencies: { repository: NoteRepository; source: NoteSource }): NoteActions {
  return {
    loadNote: createLoadController(createLoadNote(dependencies.repository)),
    saveNote: createSaveController(createSaveNote(dependencies.repository)),
    importNote: createImportController(createImportNote(dependencies.source, dependencies.repository)),
  };
}

// Worker-only operations started from a page (menu, shortcut, the notice's undo button).
export function createNoteAppendApplication(dependencies: { reader: SelectionReader; repository: NoteRepository; history: AppendHistory }): NoteAppendActions {
  const { reader, repository, history } = dependencies;
  return {
    appendNote: createAppendController(createAppendNote(repository, history)),
    appendSelection: createAppendSelectionController(createAppendSelection(reader, repository, history)),
    undoAppend: createUndoAppendController(createUndoAppend(repository, history)),
  };
}
