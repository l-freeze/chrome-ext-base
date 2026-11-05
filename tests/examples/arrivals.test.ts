/**
 * 開発者向けの参考例です。ベースの必須テストには含めません。
 * 定期的に一覧を確認して新着を数えるサンプル（features/arrivals）の書き方の例です。
 * 取得元・表示（バッジ）・時刻を差し替えて、保存される状態と返り値だけを確かめます。
 * 独自機能の開発を始める際は、書き方を参考にしたうえでこのテストを削除してください。
 * サンプルを削除・差し替えるときは、このファイルも削除してください（型チェック対象です）。
 * 実行: pnpm run test:examples
 */
import { expect, it } from "vitest";
import { createArrivalsApplication } from "../../src/features/arrivals/compose";
import { createArrivalsStorage } from "../../src/features/arrivals/gateways/storage";
import type { Arrival } from "../../src/features/arrivals/arrival";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";
import { ValidationError } from "../../src/lib/validation";

function application(lists: Arrival[][]) {
  const counts: number[] = [];
  let now = 1_000;
  const app = createArrivalsApplication({
    source: { list: async () => lists.shift() ?? [] },
    repository: createArrivalsStorage(createMemoryStorage()),
    indicator: { show: async (count) => { counts.push(count); } },
    clock: { now: () => now++ },
  });
  return { app, counts };
}

const coffee = (id: number) => ({ id, title: `Coffee ${id}` });

it("初回は一覧を記録するだけで、次の確認から増えた分を新着として数え、見たら既読にする", async () => {
  const { app, counts } = application([[coffee(1), coffee(2)], [coffee(1), coffee(2), coffee(3)], [coffee(2), coffee(3), coffee(4)]]);
  expect(await app.checkArrivals(undefined)).toEqual({ fresh: [], lastCheckedAt: 1_000 });
  expect((await app.checkArrivals(undefined)).fresh).toEqual([coffee(3)]);
  expect((await app.checkArrivals(undefined)).fresh).toEqual([coffee(3), coffee(4)]);
  expect(counts).toEqual([0, 1, 2]);

  // A closed section can show the count without marking anything as seen.
  expect((await app.loadArrivals(undefined)).fresh).toHaveLength(2);
  expect((await app.reviewArrivals(undefined)).fresh).toEqual([coffee(3), coffee(4)]);
  expect((await app.reviewArrivals(undefined)).fresh).toEqual([]);
  expect(counts.at(-1)).toBe(0);
});

it("一覧の取得に失敗したら記録を変えず、入力を取らない操作に値を渡すと拒否する", async () => {
  const { app } = application([[coffee(1)]]);
  await app.checkArrivals(undefined);
  const failing = createArrivalsApplication({
    source: { list: async () => { throw new Error("offline"); } },
    repository: createArrivalsStorage(createMemoryStorage()),
    indicator: { show: async () => {} },
    clock: { now: () => 0 },
  });
  await expect(failing.checkArrivals(undefined)).rejects.toThrow("offline");
  expect(await failing.loadArrivals(undefined)).toEqual({ fresh: [], lastCheckedAt: null });
  await expect(app.checkArrivals({ force: true })).rejects.toBeInstanceOf(ValidationError);
});
