import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { ReviewArrivals, ReviewArrivalsInput } from "../use-cases/review";

const input: Validator<ReviewArrivalsInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createReviewController(execute: ReviewArrivals) {
  return validatedAction(input, execute);
}
