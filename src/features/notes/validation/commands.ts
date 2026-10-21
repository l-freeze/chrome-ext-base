import type { ImportNoteInput, SaveNoteInput } from "../application/contracts";
import type { Validator } from "../../../shared/validation/validator";
import { object, positiveId } from "../../../shared/validation/primitives";
import { noteText } from "./note";

export const saveNoteInput: Validator<SaveNoteInput> = {
  parse(input) { return { text: noteText(object(input).text) }; },
};

export const importNoteInput: Validator<ImportNoteInput> = {
  parse(input) { return { id: positiveId(object(input).id) }; },
};
