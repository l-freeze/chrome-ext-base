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
      throw new ValidationError("保存する取得の設定の形式が不正です。");
    }
    return { includeSelection: raw.includeSelection };
  } },
  output: { parse(raw) {
    if (raw === undefined) return defaultCapturePreferences();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("version" in raw) || raw.version !== 1 ||
        !("includeSelection" in raw) || typeof raw.includeSelection !== "boolean") {
      throw new ValidationError("保存済みの取得の設定を読み出せません。");
    }
    return { includeSelection: raw.includeSelection };
  } },
  encode: (input) => ({ version: 1, ...input }),
};

export function createCapturePreferencesStorage(driver: KeyValueStorage): CapturePreferencesRepository {
  return createTypedStorage(driver, contract);
}
