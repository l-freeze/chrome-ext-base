import { expect, it } from "vitest";
import type { CommandInvocation, CommandItem } from "../../src/infrastructure/commands";
import { registerCommands } from "../../src/infrastructure/commands";

function api() {
  let listener: ((name: string, tab?: chrome.tabs.Tab) => void) | undefined;
  return {
    commands: { onCommand: { addListener: (l: typeof listener) => { listener = l; } } },
    press: (name: string, tab?: Partial<chrome.tabs.Tab>) => listener?.(name, tab as chrome.tabs.Tab),
  };
}
const item = (name: string, runs: CommandInvocation[]): CommandItem => ({ name, run: async (invocation) => { runs.push(invocation); } });

it("押されたショートカットを名前で振り分け、タブの情報を検証して渡す", async () => {
  const chrome = api();
  const runs: CommandInvocation[] = [];
  registerCommands(chrome.commands as never, [item("first", runs), item("second", [])], (error) => { throw error; });
  chrome.press("first", { id: 4, url: "https://example.test/" });
  chrome.press("unknown");
  chrome.press("first", { id: -1 });
  chrome.press("first");
  await Promise.resolve();
  expect(runs).toEqual([
    { tabId: 4, url: "https://example.test/" },
    { tabId: undefined, url: undefined },
    { tabId: undefined, url: undefined },
  ]);
});

it("処理の失敗を通知し、名前の重複を拒否する", async () => {
  const chrome = api();
  const errors: unknown[] = [];
  const failure = new Error("Failed");
  registerCommands(chrome.commands as never, [{ name: "a", run: async () => { throw failure; } }], (error) => errors.push(error));
  chrome.press("a");
  await new Promise((resolve) => setTimeout(resolve));
  expect(errors).toEqual([failure]);
  expect(() => registerCommands(chrome.commands as never, [item("x", []), item("x", [])], () => {})).toThrow(TypeError);
});
