import type { Arrival, ArrivalsState, ArrivalsView } from "./arrival";

// Public operations accept raw input; controllers validate it before each UseCase.
export interface ArrivalsActions {
  // What is new, without marking it as seen (e.g. a count next to a closed section).
  loadArrivals(input: unknown): Promise<ArrivalsView>;
  // Fetches the list and records what is new. The worker runs it on a schedule.
  checkArrivals(input: unknown): Promise<ArrivalsView>;
  // Returns what is new and marks it as seen. Screens call it when the user opens the section.
  reviewArrivals(input: unknown): Promise<ArrivalsView>;
}

export interface ArrivalsRepository {
  load(): Promise<ArrivalsState>;
  update(change: (current: ArrivalsState) => ArrivalsState): Promise<ArrivalsState>;
}

export interface ArrivalsSource {
  list(): Promise<Arrival[]>;
}

// Tells the user how many entries are new without an open screen, e.g. on the toolbar badge.
export interface ArrivalsIndicator {
  show(count: number): Promise<void>;
}

export interface ArrivalsClock {
  now(): number;
}
