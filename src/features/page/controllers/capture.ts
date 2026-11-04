import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { CaptureInput, CapturePage } from "../use-cases/capture";

const input: Validator<CaptureInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createCaptureController(execute: CapturePage) {
  return validatedAction(input, execute);
}
