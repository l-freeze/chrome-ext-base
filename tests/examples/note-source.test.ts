/**
 * 開発者向けの参考例です。ベースの必須テストには含めません。
 * メモの取得元を、自前の REST サービス用の gateway（createRestNoteSource）に差し替えて使う例です。
 * 取得元の差し替え（依存の注入）と、fetch を差し替えて通信部分を固定の応答で確かめる書き方を示します。
 * 独自機能の開発を始める際は、書き方を参考にしたうえでこのテストを削除してください。
 * サンプルを削除・差し替えるときは、このファイルも削除してください（型チェック対象です）。
 * 実行: pnpm run test:examples
 */
import { expect, it } from "vitest";
import { createNoteApplication } from "../../src/features/notes/compose";
import { createNoteStorage } from "../../src/features/notes/gateways/storage";
import { createRestNoteSource } from "../../src/features/notes/gateways/rest";
import { NoteImportError } from "../../src/features/notes/note";
import { createHttpClient, createRetryPolicy } from "../../src/infrastructure/http";
import type { Fetch } from "../../src/infrastructure/http";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";

// The service is replaced by a fetch that answers from a queue and records the requested URLs.
function service(...answers: Response[]) {
  const urls: string[] = [];
  const fetch: Fetch = async (url) => { urls.push(String(url)); return answers.shift() ?? new Response(null, { status: 500 }); };
  return { fetch, urls };
}

// Composition: the same notes feature, assembled with a REST source instead of SampleAPIs.
function application(fetch: Fetch) {
  const client = createHttpClient({ fetch, timeoutMs: 1_000, sleep: async () => {} });
  return createNoteApplication({
    repository: createNoteStorage(createMemoryStorage()),
    source: createRestNoteSource({ baseUrl: "https://notes.example.test/api", client, retry: createRetryPolicy({ maxRetries: 1 }) }),
  });
}

it("REST サービスのメモを取り込み、保存結果を返す", async () => {
  const { fetch, urls } = service(Response.json({ id: 7, text: "サービスのメモ" }));
  const app = application(fetch);
  expect(await app.importNote({ id: 7 })).toEqual({ text: "サービスのメモ" });
  expect(urls).toEqual(["https://notes.example.test/api/notes/7"]);
  expect(await app.loadNote(undefined)).toEqual({ text: "サービスのメモ" });
});

it("一時的な失敗は方針どおり再試行し、続けて失敗したら理由付きのエラーにしてメモを変えない", async () => {
  const recovered = service(new Response(null, { status: 503 }), Response.json({ id: 1, text: "再試行で取得" }));
  expect(await application(recovered.fetch).importNote({ id: 1 })).toEqual({ text: "再試行で取得" });
  expect(recovered.urls).toHaveLength(2);

  const down = service(new Response(null, { status: 503 }), new Response(null, { status: 503 }));
  const app = application(down.fetch);
  await app.saveNote({ text: "元のメモ" });
  const error = await app.importNote({ id: 1 }).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(NoteImportError);
  expect(error).toMatchObject({ reason: "server" });
  expect(await app.loadNote(undefined)).toEqual({ text: "元のメモ" });
});

it("サービスの応答が想定と違えば、取り込まずに response の理由で失敗する", async () => {
  const { fetch } = service(Response.json({ id: 1, body: "text ではない" }));
  await expect(application(fetch).importNote({ id: 1 })).rejects.toMatchObject({ name: "NoteImportError", reason: "response" });
});
