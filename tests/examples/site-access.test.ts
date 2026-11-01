/**
 * サイドパネルの権限操作をテストする参考例です。必須テストではありません。
 * 独自機能の開発時は、入力・出力の検証方法を参考にしてから削除してください。
 * サンプルの差し替え時にも削除してください（型チェック対象です）。
 * 実行: pnpm run test:examples
 */
import { expect, it } from "vitest";
import { createSiteAccessApplication } from "../../src/features/site-access/compose";
import { ValidationError } from "../../src/lib/validation";

function application(consent = true) {
  let allowed = false;
  return createSiteAccessApplication({
    status: async () => ({ available: true, tabId: 1, url: "https://example.test/article", origin: "https://example.test", allowed }),
    grant: async (input) => { allowed = consent && input.origin === "https://example.test"; return allowed; },
  });
}

it("許可の返り値と、その後のアクセス状態を確認する", async () => {
  const app = application();
  expect(await app.grant({ origin: "https://example.test" })).toBe(true);
  expect(await app.status(undefined)).toMatchObject({ allowed: true });
});
it("拒否された権限を許可済みとして扱わない", async () => {
  const app = application(false);
  expect(await app.grant({ origin: "https://example.test" })).toBe(false);
  expect(await app.status(undefined)).toMatchObject({ allowed: false });
});
it("不正な要求ではアクセス状態を変えない", async () => {
  const app = application();
  await expect(app.grant({ origin: "https://example.test/path" })).rejects.toBeInstanceOf(ValidationError);
  await expect(app.grant({ origin: "chrome://extensions" })).rejects.toBeInstanceOf(ValidationError);
  await expect(app.status({ tabId: 1 })).rejects.toBeInstanceOf(ValidationError);
  expect(await app.status(undefined)).toMatchObject({ allowed: false });
});
