import type { Note } from "../note";
import { appendText } from "../note";
import type { NoteRepository, SelectionReader } from "../ports";

export type AppendSelectionInput = { tabId: number };
export type AppendSelectionOutput = Note;
export type AppendSelection = (input: AppendSelectionInput) => Promise<AppendSelectionOutput>;

// Read the tab's selection, then append it to the current note in one locked update.
export function createAppendSelection(reader: SelectionReader, repository: NoteRepository): AppendSelection {
  return async (input) => {
    const text = await reader.read(input);
    return repository.update((current) => appendText(current, text));
  };
}
