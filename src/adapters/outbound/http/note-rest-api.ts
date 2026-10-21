import type { NoteApi } from "../../../application/ports/note-api";
import { fetchNoteInput, fetchNoteOutput } from "../../../validation/note-validation";
import { getJson } from "./http-client";
import type { Fetch } from "./http-client";

export { HttpError } from "./http-client";
export type { Fetch } from "./http-client";

export function createNoteRestApi(options: { baseUrl: string; fetch: Fetch }): NoteApi {
  const baseUrl = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.search || baseUrl.hash) {
    throw new TypeError("API baseUrl must be an HTTP(S) URL without query or fragment.");
  }
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
  return {
    async fetchNote(raw) {
      const input = fetchNoteInput.parse(raw);
      const data = await getJson(new URL(`notes/${input.id}`, baseUrl), options.fetch);
      return fetchNoteOutput.parse(data);
    },
  };
}
