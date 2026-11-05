import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { LoadArrivals, LoadArrivalsInput } from "../use-cases/load";

const input: Validator<LoadArrivalsInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createLoadController(execute: LoadArrivals) {
  return validatedAction(input, execute);
}
