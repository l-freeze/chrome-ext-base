import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { CaptureInput, CapturePage } from "../use-cases/capture";

const input: Validator<CaptureInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("この操作に引数は不要です。");
  },
};

export function createCaptureController(execute: CapturePage) {
  return validatedAction(input, execute);
}
