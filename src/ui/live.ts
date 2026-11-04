// Subscribe before reading; a late initial read must not overwrite a newer event.
export function connectLive<T>(
  load: () => Promise<T>,
  subscribe: (onValue: (value: T) => void, onError: (error: unknown) => void) => () => void,
  onValue: (value: T, changed: boolean) => void, onError: (error: unknown) => void,
): () => void {
  let active = true;
  let revision = 0;
  const stop = subscribe((value) => {
    revision++;
    if (active) onValue(value, true);
  }, (error) => {
    revision++;
    if (active) onError(error);
  });
  const initial = revision;
  void load().then((value) => {
    if (active && revision === initial) onValue(value, false);
  }, (error: unknown) => {
    if (active && revision === initial) onError(error);
  });
  return () => { active = false; stop(); };
}
