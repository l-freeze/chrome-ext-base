import type { Arrival, ArrivalsView } from "../arrival";
import type { ArrivalsActions } from "../ports";
import { ValidationError } from "../../../lib/validation";
import type { MessageContract } from "../../../infrastructure/messaging/contracts";
import type { MessageClient } from "../../../infrastructure/messaging/client";

function parseView(raw: unknown): ArrivalsView {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("fresh" in raw) || !Array.isArray(raw.fresh) ||
      !("lastCheckedAt" in raw) || !(raw.lastCheckedAt === null || typeof raw.lastCheckedAt === "number")) {
    throw new ValidationError("The worker returned unexpected arrivals.");
  }
  const fresh = raw.fresh.map((entry: unknown): Arrival => {
    if (typeof entry !== "object" || entry === null || !("id" in entry) || typeof entry.id !== "number" ||
        !("title" in entry) || typeof entry.title !== "string") {
      throw new ValidationError("The worker returned an unexpected arrival.");
    }
    return { id: entry.id, title: entry.title };
  });
  return { fresh, lastCheckedAt: raw.lastCheckedAt };
}

// The check controller validates the (empty) request in the worker.
export const checkArrivalsMessage: MessageContract<unknown, ArrivalsView> = {
  type: "arrivals.check",
  request: { parse: (raw) => raw },
  response: { parse: parseView },
};

// The worker fetches, so the check finishes even if the popup closes meanwhile.
export function delegateCheckToWorker(actions: ArrivalsActions, client: MessageClient): ArrivalsActions {
  return { ...actions, checkArrivals: (input) => client.request(checkArrivalsMessage, input) };
}
