import type { NoteSource } from "../../../application/ports/outbound/note-source";
import { importNoteInput } from "../../../validation/commands";
import { fetchNoteOutput } from "../../../validation/note";
import { getJson } from "../../../../../infrastructure/http/http-client";
import type { Fetch } from "../../../../../infrastructure/http/http-client";

export function createRestNoteSource(options: { baseUrl: string; fetch: Fetch }): NoteSource {
  const baseUrl = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.search || baseUrl.hash) {
    throw new TypeError("API baseUrl must be an HTTP(S) URL without query or fragment.");
  }
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
  return {
    async fetchNote(raw) {
      const input = importNoteInput.parse(raw);
      const data = await getJson(new URL(`notes/${input.id}`, baseUrl), options.fetch);
      return fetchNoteOutput.parse(data);
    },
  };
}
