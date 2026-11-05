import type { Note } from "./note";

// Public operations accept raw input; controllers validate it before each UseCase.
export interface NoteActions {
  loadNote(input: unknown): Promise<Note>;
  saveNote(input: unknown): Promise<Note>;
  importNote(input: unknown): Promise<Note>;
  appendNote(input: unknown): Promise<Note>;
}

// Operations that read the user's selection in a tab; only the service worker offers them.
export interface NoteSelectionActions {
  appendSelection(input: unknown): Promise<Note>;
}

export interface NoteRepository {
  save(input: Note): Promise<void>;
  load(): Promise<Note>;
  // For changes derived from the current note; runs without interleaving with other writes.
  update(change: (current: Note) => Note): Promise<Note>;
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

// Reads the text the user has selected in a tab.
export interface SelectionReader {
  read(input: { tabId: number }): Promise<string>;
}
