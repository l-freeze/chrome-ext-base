/**
 * 開発者向けの参考例です。ベースの必須テストには含めません。
 * 独自機能の開発を始める際は、入力・出力を検証する書き方を参考にしたうえで、
 * このテストを削除してください。サンプルの設定項目・初期値は引き継ぐ必要がありません。
 * 独自機能のテストは tests/features/ などに新しく作成してください。
 * サンプルを削除・差し替えるときは、このファイルも削除してください（型チェック対象です）。
 * 実行: pnpm run test:examples
 */
import { expect, it } from "vitest";
import { createSettingsApplication } from "../../src/features/settings/compose";
import { createSettingsStorage } from "../../src/features/settings/gateways/storage";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";
import { ValidationError } from "../../src/lib/validation";

function application() {
  return createSettingsApplication(createSettingsStorage(createMemoryStorage()));
}

it("確認済みのリセットは初期設定を返し、保存にも反映する", async () => {
  const app = application();
  await app.save({ theme: "dark" });
  const initial = { theme: "system" };
  expect(await app.reset({ confirmed: true })).toEqual(initial);
  expect(await app.load(undefined)).toEqual(initial);
});

it("確認されていないリセットは拒否し、保存内容を維持する", async () => {
  const app = application();
  const saved = { theme: "dark" };
  await app.save(saved);
  await expect(app.reset({ confirmed: false })).rejects.toBeInstanceOf(ValidationError);
  expect(await app.load(undefined)).toEqual(saved);
});

it("書き出したバックアップを読み込むと同じ設定に戻り、形式の違うファイルは拒否して設定を変えない", async () => {
  const app = application();
  await app.save({ theme: "dark" });
  const backup = await app.exportBackup(undefined);
  expect(backup).toMatchObject({ version: 1, settings: { theme: "dark" } });
  await app.reset({ confirmed: true });
  expect(await app.importBackup(JSON.parse(JSON.stringify(backup)))).toEqual({ theme: "dark" });

  await expect(app.importBackup({ format: "something-else", version: 1, settings: { theme: "light" } })).rejects.toBeInstanceOf(ValidationError);
  await expect(app.importBackup({ ...backup, settings: { theme: "purple" } })).rejects.toBeInstanceOf(ValidationError);
  expect(await app.load(undefined)).toEqual({ theme: "dark" });
});
