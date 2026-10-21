import type { FetchNoteInput, FetchNoteOutput } from "../application/ports/note-api";
import type { LoadNoteOutput, SaveNoteInput } from "../application/ports/storage";
import type { Validator } from "../application/ports/validation";
import { MAX_NOTE_LENGTH } from "../domain/note";

export class ValidationError extends Error {
  override name = "ValidationError";
}

export function object(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("オブジェクトを指定してください。");
  }
  return input as Record<string, unknown>;
}

function text(input: unknown): string {
  if (typeof input !== "string" || input.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`メモは ${MAX_NOTE_LENGTH} 文字以内の文字列で指定してください。`);
  }
  return input;
}

export function positiveId(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 1) {
    throw new ValidationError("ID は正の安全な整数で指定してください。");
  }
  return input;
}

export const noInput: Validator<void> = {
  parse(input) {
    if (input !== undefined) throw new ValidationError("この操作に引数は不要です。");
  },
};

export const saveNoteInput: Validator<SaveNoteInput> = {
  parse(input) { return { text: text(object(input).text) }; },
};

export const fetchNoteInput: Validator<FetchNoteInput> = {
  parse(input) { return { id: positiveId(object(input).id) }; },
};

export const fetchNoteOutput: Validator<FetchNoteOutput> = {
  parse(input) {
    const value = object(input);
    return { id: positiveId(value.id), text: text(value.text) };
  },
};

export const storedNoteOutput: Validator<LoadNoteOutput> = {
  parse(input) { return { text: input === undefined ? "" : text(input) }; },
};
