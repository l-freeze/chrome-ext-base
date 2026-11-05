import type { Note } from "../note";
import type { AppendHistory, NoteRepository, SelectionReader } from "../ports";
import { appendAndRecord } from "./append";

export type AppendSelectionInput = { tabId: number };
export type AppendSelectionOutput = Note;
export type AppendSelection = (input: AppendSelectionInput) => Promise<AppendSelectionOutput>;

// Read the tab's selection, then append it like any other text.
export function createAppendSelection(reader: SelectionReader, repository: NoteRepository, history: AppendHistory): AppendSelection {
  return async (input) => appendAndRecord(repository, history, await reader.read(input));
}
