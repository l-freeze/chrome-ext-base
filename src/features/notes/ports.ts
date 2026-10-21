import type { Note } from "./note";

// Public operations accept raw input; controllers validate it before each UseCase.
export interface NoteActions {
  loadNote(input: unknown): Promise<Note>;
  saveNote(input: unknown): Promise<Note>;
  importNote(input: unknown): Promise<Note>;
}

export interface NoteRepository {
  save(input: Note): Promise<void>;
  load(): Promise<Note>;
}

export interface FetchNoteInput { id: number }
export interface FetchNoteOutput { id: number; text: string }

export interface NoteSource {
  fetchNote(input: FetchNoteInput): Promise<FetchNoteOutput>;
}
