import type { FetchNoteOutput, NoteSource } from "../ports";
import { noteText } from "../note";
import { ValidationError } from "../../../lib/validation";
import { getJson } from "../../../infrastructure/http";
import type { HttpClient, RetryPolicy } from "../../../infrastructure/http";

function parseResponse(raw: unknown): FetchNoteOutput {
  if (
    typeof raw !== "object" || raw === null || Array.isArray(raw) || !("id" in raw) ||
    typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || raw.id < 1 || !("text" in raw)
  ) {
    throw new ValidationError("The notes service returned an unexpected note.");
  }
  return { id: raw.id, text: noteText(raw.text) };
}

export function createRestNoteSource(options: { baseUrl: string; client: HttpClient; retry?: RetryPolicy }): NoteSource {
  const baseUrl = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.search || baseUrl.hash) {
    throw new TypeError("API baseUrl must be an HTTP(S) URL without query or fragment.");
  }
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
  return {
    async fetchNote(input) {
      const data = await getJson(options.client, new URL(`notes/${input.id}`, baseUrl), options.retry ? { retry: options.retry } : {});
      return parseResponse(data);
    },
  };
}
