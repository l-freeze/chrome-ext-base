import type { NoteApi } from "../application/ports/note-api";
import type { NoteStorage } from "../application/ports/storage";
import { createImportNote } from "../application/use-cases/import-note";
import { createLoadNote } from "../application/use-cases/load-note";
import { createSaveNote } from "../application/use-cases/save-note";
import { createNoteController } from "../adapters/inbound/note-controller";

export function createApplication(dependencies: { storage: NoteStorage; api: NoteApi }) {
  return createNoteController({
    loadNote: createLoadNote(dependencies.storage),
    saveNote: createSaveNote(dependencies.storage),
    importNote: createImportNote(dependencies.api, dependencies.storage),
  });
}
