import { ValidationError } from "../../lib/validation";

export const MAX_NOTE_LENGTH = 2000;

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
export function appendText(note: Note, text: string): Note {
  return { text: noteText(note.text === "" ? text : `${note.text}\n\n${text}`) };
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
