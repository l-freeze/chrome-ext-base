import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import type { ExportBackup, ExportBackupInput } from "../use-cases/export";

const input: Validator<ExportBackupInput> = {
  parse(raw) {
    if (raw !== undefined) throw new ValidationError("This operation takes no input.");
  },
};

export function createExportController(execute: ExportBackup) {
  return validatedAction(input, execute);
}
