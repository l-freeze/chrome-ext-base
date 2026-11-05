import type { ArrivalsView } from "../arrival";
import { markSeen, viewOf } from "../arrival";
import type { ArrivalsIndicator, ArrivalsRepository } from "../ports";

export type ReviewArrivalsInput = void;
export type ReviewArrivalsOutput = ArrivalsView;
export type ReviewArrivals = (input: ReviewArrivalsInput) => Promise<ReviewArrivalsOutput>;

// Hand the new entries to the screen and mark them as seen in the same locked update.
export function createReviewArrivals(repository: ArrivalsRepository, indicator: ArrivalsIndicator): ReviewArrivals {
  return async () => {
    let view: ArrivalsView = { fresh: [], lastCheckedAt: null };
    await repository.update((current) => { view = viewOf(current); return markSeen(current); });
    await indicator.show(0);
    return view;
  };
}
