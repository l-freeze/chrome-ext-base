import type { ArrivalsView } from "../arrival";
import { recordList, viewOf } from "../arrival";
import type { ArrivalsClock, ArrivalsIndicator, ArrivalsRepository, ArrivalsSource } from "../ports";

export type CheckArrivalsInput = void;
export type CheckArrivalsOutput = ArrivalsView;
export type CheckArrivals = (input: CheckArrivalsInput) => Promise<CheckArrivalsOutput>;

export function createCheckArrivals(source: ArrivalsSource, repository: ArrivalsRepository, indicator: ArrivalsIndicator, clock: ArrivalsClock): CheckArrivals {
  return async () => {
    const listed = await source.list();
    const state = await repository.update((current) => recordList(current, listed, clock.now()));
    await indicator.show(state.fresh.length);
    return viewOf(state);
  };
}
