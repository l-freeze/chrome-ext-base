import { expect, it } from "vitest";
import { createBadgeBoard, createTabBadge } from "../../src/infrastructure/badge";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";

function action() {
  const state = { text: "", color: "", tabs: new Map<number, { text: string | null; color?: string }>() };
  return {
    state,
    api: {
      async setBadgeText(details: { text?: string | null; tabId?: number }) {
        if (details.tabId === undefined) state.text = details.text ?? "";
        else state.tabs.set(details.tabId, { ...state.tabs.get(details.tabId), text: details.text ?? null });
      },
      async setBadgeBackgroundColor(details: { color: string; tabId?: number }) {
        if (details.tabId === undefined) state.color = details.color;
      },
    },
  };
}

it("共有のバッジは優先度の高い枠を表示し、その枠を消すと次の枠を表示する", async () => {
  const { api, state } = action();
  const board = createBadgeBoard(api as never, createMemoryStorage());
  const low = board.slot("low", 10);
  const high = board.slot("high", 20);
  await low.show("●", "#111111");
  expect(state).toMatchObject({ text: "●", color: "#111111" });
  await high.show("3", "#222222");
  expect(state).toMatchObject({ text: "3", color: "#222222" });
  await low.clear();
  expect(state.text).toBe("3");
  await high.clear();
  expect(state.text).toBe("");
});

it("枠は保存されるので、別の実行環境から消せ、再起動後の render で描き直せる", async () => {
  const driver = createMemoryStorage();
  const worker = action();
  await createBadgeBoard(worker.api as never, driver).slot("count", 20).show("2", "#222222");

  const restarted = action();
  await createBadgeBoard(restarted.api as never, driver).render();
  expect(restarted.state.text).toBe("2");

  const screen = action();
  await createBadgeBoard(screen.api as never, driver).slot("count", 20).clear();
  expect(screen.state.text).toBe("");
});

it("壊れた枠は無視して他の枠を表示し、空の文字や数値でない優先度は拒否する", async () => {
  const driver = createMemoryStorage();
  await driver.set("action-badge", { broken: { text: 1 }, kept: { text: "!", color: "#333333", priority: 1 } });
  const { api, state } = action();
  const board = createBadgeBoard(api as never, driver);
  await board.render();
  expect(state.text).toBe("!");
  await expect(board.slot("x", 1).show("", "#000000")).rejects.toBeInstanceOf(RangeError);
  expect(() => board.slot("x", Number.NaN)).toThrow(RangeError);
});

it("タブごとのバッジを表示し、消すときはそのタブの指定だけを外す", async () => {
  const { api, state } = action();
  const badge = createTabBadge(api as never);
  await badge.show(4, "!", "#ad334a");
  expect(state.tabs.get(4)?.text).toBe("!");
  await badge.clear(4);
  expect(state.tabs.get(4)?.text).toBeNull();
});
