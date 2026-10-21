import type { Note } from "../domain/note";

export type SaveNoteInput = Note;
export type LoadNoteOutput = Note;
export interface ImportNoteInput { id: number }
export interface FetchNoteOutput { id: number; text: string }
