import type { NoteRepository } from "../ports/outbound/note-repository";

export function createLoadNote(repository: NoteRepository) {
  return async (_input: void) => repository.load();
}
