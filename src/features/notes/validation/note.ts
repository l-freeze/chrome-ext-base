import type { Validator } from "../../../shared/validation/validator";
import { object, positiveId, ValidationError } from "../../../shared/validation/primitives";
import type { FetchNoteOutput } from "../application/contracts";
import { MAX_NOTE_LENGTH } from "../domain/note";

export function noteText(input: unknown): string {
  if (typeof input !== "string" || input.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`メモは ${MAX_NOTE_LENGTH} 文字以内の文字列で指定してください。`);
  }
  return input;
}

export const fetchNoteOutput: Validator<FetchNoteOutput> = {
  parse(input) {
    const value = object(input);
    return { id: positiveId(value.id), text: noteText(value.text) };
  },
};
