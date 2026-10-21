import type { LoadNoteOutput, SaveNoteInput } from "../../contracts";

export interface NoteRepository {
  save(input: SaveNoteInput): Promise<void>;
  load(): Promise<LoadNoteOutput>;
}
