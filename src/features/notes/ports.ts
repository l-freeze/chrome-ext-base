import type { Note } from "./note";

// Public operations accept raw input; controllers validate it before each UseCase.
export interface NoteActions {
  loadNote(input: unknown): Promise<Note>;
  saveNote(input: unknown): Promise<Note>;
  importNote(input: unknown): Promise<Note>;
  appendNote(input: unknown): Promise<Note>;
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

// UI event subscription for notes saved by another screen or the service worker.
export interface NoteChanges {
  subscribe(onValue: (value: Note) => void, onError: (error: unknown) => void): () => void;
}
