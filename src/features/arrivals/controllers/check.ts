import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { CheckArrivals, CheckArrivalsInput } from "../use-cases/check";

const input: Validator<CheckArrivalsInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createCheckController(execute: CheckArrivals) {
  return validatedAction(input, execute);
}
