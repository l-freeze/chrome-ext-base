import { expect, it } from "vitest";
import type { ContextMenuClick, ContextMenuItem } from "../../src/infrastructure/context-menus";
import { registerContextMenus } from "../../src/infrastructure/context-menus";

function api() {
  const created: chrome.contextMenus.CreateProperties[] = [];
  let installed: (() => void) | undefined;
  let clicked: ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void) | undefined;
  return {
    created,
    menus: {
      create: (props: chrome.contextMenus.CreateProperties) => { created.push(props); return props.id ?? ""; },
      removeAll: async () => { created.length = 0; },
      onClicked: { addListener: (listener: typeof clicked) => { clicked = listener; } },
    },
    installed: { addListener: (listener: () => void) => { installed = listener; } },
    install: async () => { installed?.(); await new Promise((resolve) => setTimeout(resolve)); },
    click: (info: Partial<chrome.contextMenus.OnClickData>, tab?: Partial<chrome.tabs.Tab>) =>
      clicked?.({ editable: false, ...info } as chrome.contextMenus.OnClickData, tab as chrome.tabs.Tab),
  };
}

function item(id: string, clicks: ContextMenuClick[]): ContextMenuItem {
  return { id, title: `Title ${id}`, contexts: ["selection"], onClick: async (click) => { clicks.push(click); } };
}

it("インストール・更新時に項目を作り直し、クリックを該当項目へ渡す", async () => {
  const chrome = api();
  const clicks: ContextMenuClick[] = [];
  registerContextMenus(chrome.menus as never, chrome.installed as never, [item("a", clicks), item("b", [])], (error) => { throw error; });
  await chrome.install();
  await chrome.install();
  expect(chrome.created.map((props) => props.id)).toEqual(["a", "b"]);
  chrome.click({ menuItemId: "a", selectionText: "selected", pageUrl: "https://example.test/" }, { id: 3 });
  chrome.click({ menuItemId: "unknown" });
  chrome.click({ menuItemId: "a" }, { id: -1 });
  await Promise.resolve();
  expect(clicks).toEqual([
    { selectionText: "selected", pageUrl: "https://example.test/", tabId: 3 },
    { selectionText: undefined, pageUrl: undefined, tabId: undefined },
  ]);
});

it("処理の失敗を通知し、ID の重複を拒否する", async () => {
  const chrome = api();
  const errors: unknown[] = [];
  const failure = new Error("Failed");
  registerContextMenus(chrome.menus as never, chrome.installed as never,
    [{ id: "a", title: "A", contexts: ["page"], onClick: async () => { throw failure; } }], (error) => errors.push(error));
  chrome.click({ menuItemId: "a" });
  await new Promise((resolve) => setTimeout(resolve));
  expect(errors).toEqual([failure]);
  expect(() => registerContextMenus(chrome.menus as never, chrome.installed as never, [item("x", []), item("x", [])], () => {})).toThrow(TypeError);
});
