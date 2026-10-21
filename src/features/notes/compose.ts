import type { NoteSource } from "./application/ports/outbound/note-source";
import type { NoteRepository } from "./application/ports/outbound/note-repository";
import { createImportNote } from "./application/use-cases/import-note";
import { createLoadNote } from "./application/use-cases/load-note";
import { createSaveNote } from "./application/use-cases/save-note";
import { createNoteController } from "./adapters/inbound/note-controller";

export function createNoteApplication(dependencies: { repository: NoteRepository; source: NoteSource }) {
  return createNoteController({
    loadNote: createLoadNote(dependencies.repository),
    saveNote: createSaveNote(dependencies.repository),
    importNote: createImportNote(dependencies.source, dependencies.repository),
  });
}
