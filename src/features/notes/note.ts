import { ValidationError } from "../../lib/validation";

export const MAX_NOTE_LENGTH = 2000;

// The review reminder asks the user to look at the note again this long after it last changed.
export const REVIEW_DELAY_MINUTES = 60;

export interface Note {
  text: string;
}

// A Note invariant, independent of any command or persisted representation.
export function noteText(input: unknown): string {
  if (typeof input !== "string" || input.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`A note must be a string of at most ${MAX_NOTE_LENGTH} characters.`);
  }
  return input;
}

// Appending keeps the same invariant as any other way of producing a Note.
// Why an append could not happen. The UI (or the worker's page notice) words them.
export type AppendFailure = "no-selection" | "too-long";

export class NoteAppendError extends Error {
  override name = "NoteAppendError";
  readonly reason: AppendFailure;
  constructor(reason: AppendFailure) {
    super(`Note append failed: ${reason}`);
    this.reason = reason;
  }
}

export function appendText(note: Note, text: string): Note {
  if (text.trim() === "") throw new NoteAppendError("no-selection");
  const joined = note.text === "" ? text : `${note.text}\n\n${text}`;
  if (joined.length > MAX_NOTE_LENGTH) throw new NoteAppendError("too-long");
  return { text: noteText(joined) };
}

// What one append changed, kept so the user can undo it from the page's notice.
export interface AppendRecord {
  before: string;
  after: string;
}

// Why an undo could not happen: nothing was appended, or the note changed after the append.
export type UndoFailure = "nothing" | "changed";

export class NoteUndoError extends Error {
  override name = "NoteUndoError";
  readonly reason: UndoFailure;
  constructor(reason: UndoFailure) {
    super(`Note undo failed: ${reason}`);
    this.reason = reason;
  }
}

// Undo only restores the note the append replaced; a later edit is never overwritten.
export function undoAppend(note: Note, record: AppendRecord | null): Note {
  if (!record) throw new NoteUndoError("nothing");
  if (note.text !== record.after) throw new NoteUndoError("changed");
  return { text: noteText(record.before) };
}

// Why an import failed. Gateways translate transport and service errors into these; the UI words them.
export type ImportFailure = "network" | "timeout" | "server" | "response";

export class NoteImportError extends Error {
  override name = "NoteImportError";
  readonly reason: ImportFailure;
  constructor(reason: ImportFailure, options?: { cause?: unknown }) {
    super(`Note import failed: ${reason}`, options);
    this.reason = reason;
  }
}
