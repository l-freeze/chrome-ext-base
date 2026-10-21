export interface FetchNoteInput { id: number }
export interface FetchNoteOutput { id: number; text: string }

export interface NoteApi {
  fetchNote(input: FetchNoteInput): Promise<FetchNoteOutput>;
}
