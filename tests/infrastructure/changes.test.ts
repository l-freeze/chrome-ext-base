import { expect, it } from "vitest";
import { createChromeChanges } from "../../src/infrastructure/storage/drivers/chrome";

it("購読した local のキーだけを通知し、解除後は通知しない", () => {
  type Listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
  const listeners = new Set<Listener>();
  const events = {
    addListener: (listener: Listener) => { listeners.add(listener); },
    removeListener: (listener: Listener) => { listeners.delete(listener); },
  };
  const emit = (changes: Record<string, chrome.storage.StorageChange>, area = "local") => {
    for (const listener of listeners) listener(changes, area);
  };
  const received: unknown[] = [];
  const stop = createChromeChanges(events).subscribe("example", (value) => received.push(value), (error) => { throw error; });
  emit({ unrelated: { newValue: 1 } });
  emit({ example: { newValue: 2 } }, "sync");
  emit({ example: { newValue: { value: 3 } } });
  emit({ example: {} });
  stop();
  emit({ example: { newValue: 4 } });
  expect(received).toEqual([{ value: 3 }, undefined]);
});
