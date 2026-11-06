import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import { noteText } from "../note";
import type {
  DismissReminder, DismissReminderInput, NoteChanged, NoteChangedInput, RemindReview, RemindReviewInput,
} from "../use-cases/reminder";

const changed: Validator<NoteChangedInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("text" in raw)) {
      throw new ValidationError("Expected the changed note as { text }.");
    }
    return { text: noteText(raw.text) };
  },
};

const none: Validator<RemindReviewInput & DismissReminderInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export const createNoteChangedController = (execute: NoteChanged) => validatedAction(changed, execute);
export const createRemindReviewController = (execute: RemindReview) => validatedAction(none, execute);
export const createDismissReminderController = (execute: DismissReminder) => validatedAction(none, execute);
