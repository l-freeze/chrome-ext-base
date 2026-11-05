import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { AppendSelection, AppendSelectionInput } from "../use-cases/append-selection";

const input: Validator<AppendSelectionInput> = {
  parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("tabId" in raw) ||
        typeof raw.tabId !== "number" || !Number.isSafeInteger(raw.tabId) || raw.tabId < 0) {
      throw new ValidationError("Expected { tabId } as a non-negative safe integer.");
    }
    return { tabId: raw.tabId };
  },
};

export function createAppendSelectionController(execute: AppendSelection) {
  return validatedAction(input, execute);
}
