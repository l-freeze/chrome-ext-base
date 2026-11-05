/**
 * 開発者向けの参考例です。ベースの必須テストには含めません。
 * 独自機能の開発を始める際は、入力・出力を検証する書き方を参考にしたうえで、
 * このテストを削除してください。サンプルの仕様に独自機能を合わせる必要はありません。
 * 独自機能のテストは tests/features/ などに新しく作成してください。
 * サンプルを削除・差し替えるときは、このファイルも削除してください（型チェック対象です）。
 * 実行: pnpm run test:examples
 */
import { expect, it } from "vitest";
import { createNoteApplication, createNoteSelectionApplication } from "../../src/features/notes/compose";
import { createNoteStorage } from "../../src/features/notes/gateways/storage";
import { createMockNoteSource } from "../../src/features/notes/gateways/mock";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";
import { MAX_NOTE_LENGTH } from "../../src/features/notes/note";
import { ValidationError } from "../../src/lib/validation";

function application() {
  const driver = createMemoryStorage();
  const app = createNoteApplication({
    repository: createNoteStorage(driver),
    source: createMockNoteSource([{ id: 1, text: "取得したメモ" }]),
  });
  return { app, driver };
}

it("保存の入力・出力と、別インスタンスからの読み出しを確認する", async () => {
  const { app, driver } = application();
  const input = { text: "新しいアイデア" };
  expect(await app.saveNote(input)).toEqual(input);
  expect(await createNoteStorage(driver).load()).toEqual(input);
});

it("不正入力はエラーになり、以前の保存内容を維持する", async () => {
  const { app } = application();
  await app.saveNote({ text: "保持するメモ" });
  await expect(app.saveNote({ text: 123 })).rejects.toBeInstanceOf(ValidationError);
  expect(await app.loadNote(undefined)).toEqual({ text: "保持するメモ" });
});

it("外部取得はモックを注入し、取り込み結果と保存結果を確認する", async () => {
  const { app } = application();
  expect(await app.importNote({ id: 1 })).toEqual({ text: "取得したメモ" });
  expect(await app.loadNote(undefined)).toEqual({ text: "取得したメモ" });
});

// The selection reader (a gateway that runs a script in the tab) is replaced by a fixed answer.
it("タブで選択した文章をメモの末尾に追加し、追加できない理由はコードで返してメモを変えない", async () => {
  const driver = createMemoryStorage();
  const repository = createNoteStorage(driver);
  let selected = "選択した文章";
  const selection = createNoteSelectionApplication({ reader: { read: async () => selected }, repository });
  await repository.save({ text: "元のメモ" });

  expect(await selection.appendSelection({ tabId: 1 })).toEqual({ text: "元のメモ\n\n選択した文章" });

  selected = "   ";
  await expect(selection.appendSelection({ tabId: 1 })).rejects.toMatchObject({ name: "NoteAppendError", reason: "no-selection" });
  selected = "x".repeat(MAX_NOTE_LENGTH);
  await expect(selection.appendSelection({ tabId: 1 })).rejects.toMatchObject({ name: "NoteAppendError", reason: "too-long" });
  await expect(selection.appendSelection({ tabId: -1 })).rejects.toBeInstanceOf(ValidationError);
  expect(await repository.load()).toEqual({ text: "元のメモ\n\n選択した文章" });
});
