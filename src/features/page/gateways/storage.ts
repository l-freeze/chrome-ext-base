import type { CapturePreferences } from "../page";
import { defaultCapturePreferences } from "../page";
import type { CapturePreferencesRepository } from "../ports";
import { ValidationError } from "../../../lib/validation";
import type { KeyValueStorage, StorageContract } from "../../../infrastructure/storage/contracts";
import { createTypedStorage } from "../../../infrastructure/storage/typed";

const contract: StorageContract<CapturePreferences, CapturePreferences> = {
  key: "page-capture",
  input: { parse(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        !("includeSelection" in raw) || typeof raw.includeSelection !== "boolean") {
      throw new ValidationError("Capture preferences to save must be { includeSelection: boolean }.");
    }
    return { includeSelection: raw.includeSelection };
  } },
  output: { parse(raw) {
    if (raw === undefined) return defaultCapturePreferences();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("version" in raw) || raw.version !== 1 ||
        !("includeSelection" in raw) || typeof raw.includeSelection !== "boolean") {
      throw new ValidationError("Stored capture preferences are not in a known format.");
    }
    return { includeSelection: raw.includeSelection };
  } },
  encode: (input) => ({ version: 1, ...input }),
};

export function createCapturePreferencesStorage(driver: KeyValueStorage): CapturePreferencesRepository {
  return createTypedStorage(driver, contract);
}
