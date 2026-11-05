import type { Arrival, ArrivalsState } from "../arrival";
import { INITIAL_ARRIVALS } from "../arrival";
import type { ArrivalsRepository } from "../ports";
import { ValidationError } from "../../../lib/validation";
import type { KeyValueStorage, StorageContract } from "../../../infrastructure/storage/contracts";
import { createTypedStorage } from "../../../infrastructure/storage/typed";

const isId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

function parseArrival(raw: unknown): Arrival {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("id" in raw) || !isId(raw.id) ||
      !("title" in raw) || typeof raw.title !== "string") {
    throw new ValidationError("A stored arrival must be { id, title }.");
  }
  return { id: raw.id, title: raw.title };
}

function parseState(raw: unknown): ArrivalsState {
  if (raw === undefined) return INITIAL_ARRIVALS;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("known" in raw) || !("fresh" in raw) || !("lastCheckedAt" in raw)) {
    throw new ValidationError("Stored arrivals must be { known, fresh, lastCheckedAt }.");
  }
  const { known, fresh, lastCheckedAt } = raw;
  if (known !== null && !(Array.isArray(known) && known.every(isId))) throw new ValidationError("Stored known ids are invalid.");
  if (!Array.isArray(fresh)) throw new ValidationError("Stored fresh arrivals must be a list.");
  if (lastCheckedAt !== null && !(typeof lastCheckedAt === "number" && Number.isFinite(lastCheckedAt))) {
    throw new ValidationError("Stored lastCheckedAt must be a time or null.");
  }
  return { known: known === null ? null : [...known], fresh: fresh.map(parseArrival), lastCheckedAt };
}

const contract: StorageContract<ArrivalsState, ArrivalsState> = {
  key: "coffee-arrivals",
  input: { parse: parseState },
  output: { parse: parseState },
  encode: (input) => input,
};

export function createArrivalsStorage(driver: KeyValueStorage): ArrivalsRepository {
  return createTypedStorage(driver, contract);
}
