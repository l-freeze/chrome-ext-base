import type { AppendRecord, Note } from "./note";

// Public operations accept raw input; controllers validate it before each UseCase.
export interface NoteActions {
  loadNote(input: unknown): Promise<Note>;
  saveNote(input: unknown): Promise<Note>;
  importNote(input: unknown): Promise<Note>;
}

// Appending from the page (context menu, shortcut) and undoing it; only the service worker offers them.
export interface NoteAppendActions {
  appendNote(input: unknown): Promise<Note>;
  appendSelection(input: unknown): Promise<Note>;
  undoAppend(input: unknown): Promise<Note>;
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

// The last append, for undo. null when there is nothing to undo.
export interface AppendHistory {
  save(input: AppendRecord | null): Promise<void>;
  load(): Promise<AppendRecord | null>;
}

// The review reminder. The worker reports every change and the scheduled time; screens dismiss it.
export interface NoteReminderActions {
  noteChanged(input: unknown): Promise<void>;
  remindReview(input: unknown): Promise<void>;
}

export interface NoteReminderDismissal {
  dismissReminder(input: unknown): Promise<void>;
}

// When the reminder fires (an alarm in the extension).
export interface ReminderSchedule {
  schedule(delayMinutes: number): Promise<void>;
  cancel(): Promise<void>;
}

// How the user sees the reminder without an open screen (the toolbar badge in the extension).
export interface ReminderIndicator {
  show(): Promise<void>;
  clear(): Promise<void>;
}

// UI event subscription for notes saved by another screen or the service worker.
export interface NoteChanges {
  subscribe(onValue: (value: Note) => void, onError: (error: unknown) => void): () => void;
}

// Reads the text the user has selected in a tab.
export interface SelectionReader {
  read(input: { tabId: number }): Promise<string>;
}
