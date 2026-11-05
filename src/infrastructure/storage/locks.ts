// Serializes work on one storage key, so a read-modify-write cannot interleave with another write.
export interface KeyLocks {
  run<T>(key: string, task: () => Promise<T>): Promise<T>;
}

// Within one JavaScript context only (one page or the worker). The default for drivers and tests.
export function createProcessLocks(): KeyLocks {
  const tails = new Map<string, Promise<unknown>>();
  return {
    run(key, task) {
      const result = (tails.get(key) ?? Promise.resolve()).then(task, task);
      const tail = result.catch(() => {});
      tails.set(key, tail);
      void tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
      return result;
    },
  };
}

// Across every context of the extension (popup, side panel, options, service worker), which share
// an origin, through the Web Locks API.
export function createWebLocks(manager: LockManager, prefix = "chrome-ext-base:storage:"): KeyLocks {
  return { run: (key, task) => manager.request(prefix + key, task) };
}
