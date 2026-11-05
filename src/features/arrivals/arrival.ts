// Sample: new entries in a list that is checked on a schedule (the SampleAPIs coffee list).
export interface Arrival {
  id: number;
  title: string;
}

export interface ArrivalsState {
  // Every id seen so far. null until the first check, which only records the list as it is.
  known: number[] | null;
  // Entries found since the user last looked, oldest first.
  fresh: Arrival[];
  lastCheckedAt: number | null;
}

// What screens show.
export interface ArrivalsView {
  fresh: Arrival[];
  lastCheckedAt: number | null;
}

export const MAX_FRESH = 50;
export const MAX_KNOWN = 1_000;
export const INITIAL_ARRIVALS: ArrivalsState = { known: null, fresh: [], lastCheckedAt: null };

// The first check only records the list, so an install does not report every entry as new.
export function recordList(state: ArrivalsState, listed: readonly Arrival[], checkedAt: number): ArrivalsState {
  const ids = listed.map((entry) => entry.id);
  if (state.known === null) return { known: ids.slice(-MAX_KNOWN), fresh: [], lastCheckedAt: checkedAt };
  const known = new Set(state.known);
  const added = listed.filter((entry) => !known.has(entry.id));
  return {
    known: [...state.known, ...added.map((entry) => entry.id)].slice(-MAX_KNOWN),
    fresh: [...state.fresh, ...added].slice(-MAX_FRESH),
    lastCheckedAt: checkedAt,
  };
}

export function markSeen(state: ArrivalsState): ArrivalsState {
  return { ...state, fresh: [] };
}

export function viewOf(state: ArrivalsState): ArrivalsView {
  return { fresh: state.fresh, lastCheckedAt: state.lastCheckedAt };
}
