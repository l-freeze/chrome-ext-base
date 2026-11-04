import { ValidationError } from "../../lib/validation";

export const MAX_NOTE_LENGTH = 2000;

export interface Note {
  text: string;
}

// A Note invariant, independent of any command or persisted representation.
export function noteText(input: unknown): string {
  if (typeof input !== "string" || input.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`メモは ${MAX_NOTE_LENGTH} 文字以内の文字列で指定してください。`);
  }
  return input;
}

// Appending keeps the same invariant as any other way of producing a Note.
export function appendText(note: Note, text: string): Note {
  return { text: noteText(note.text === "" ? text : `${note.text}\n\n${text}`) };
}
