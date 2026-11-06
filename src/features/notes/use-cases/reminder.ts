import type { Note } from "../note";
import { REVIEW_DELAY_MINUTES } from "../note";
import type { NoteRepository, ReminderIndicator, ReminderSchedule } from "../ports";

export type NoteChangedInput = Note;
export type NoteChanged = (input: NoteChangedInput) => Promise<void>;
export type RemindReviewInput = void;
export type RemindReview = (input: RemindReviewInput) => Promise<void>;
export type DismissReminderInput = void;
export type DismissReminder = (input: DismissReminderInput) => Promise<void>;

// Any change restarts the wait; an empty note has nothing to review, so its reminder is cancelled.
// A change also means the user is looking at the note, so a shown reminder goes away.
export function createNoteChanged(schedule: ReminderSchedule, indicator: ReminderIndicator): NoteChanged {
  return async (note) => {
    if (note.text === "") await schedule.cancel();
    else await schedule.schedule(REVIEW_DELAY_MINUTES);
    await indicator.clear();
  };
}

// The note may have been emptied since the reminder was scheduled; then there is nothing to show.
export function createRemindReview(repository: NoteRepository, indicator: ReminderIndicator): RemindReview {
  return async () => {
    if ((await repository.load()).text !== "") await indicator.show();
  };
}

// Opening a screen with the note counts as looking at it again.
export function createDismissReminder(indicator: ReminderIndicator): DismissReminder {
  return () => indicator.clear();
}
