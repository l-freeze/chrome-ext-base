import type { ArrivalsView } from "../arrival";
import { viewOf } from "../arrival";
import type { ArrivalsRepository } from "../ports";

export type LoadArrivalsInput = void;
export type LoadArrivalsOutput = ArrivalsView;
export type LoadArrivals = (input: LoadArrivalsInput) => Promise<LoadArrivalsOutput>;

export function createLoadArrivals(repository: ArrivalsRepository): LoadArrivals {
  return async () => viewOf(await repository.load());
}
