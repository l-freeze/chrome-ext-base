/**
 * 開発者向けの参考例です。ベースの必須テストには含めません。
 * 独自機能の開発を始める際は、入力・出力を検証する書き方を参考にしたうえで、
 * このテストを削除してください。サンプルの仕様に独自機能を合わせる必要はありません。
 * 独自機能のテストは tests/features/ などに新しく作成してください。
 * サンプルを削除・差し替えるときは、このファイルも削除してください（型チェック対象です）。
 * 実行: pnpm run test:examples
 */
import { expect, it } from "vitest";
import { createNoteAppendApplication, createNoteApplication, createNoteReminderApplication, createNoteReminderDismissal } from "../../src/features/notes/compose";
import { createAppendHistory, createNoteStorage } from "../../src/features/notes/gateways/storage";
import { createMockNoteSource } from "../../src/features/notes/gateways/mock";
import { createMemoryStorage } from "../../src/infrastructure/storage/drivers/memory";
import { MAX_NOTE_LENGTH, REVIEW_DELAY_MINUTES } from "../../src/features/notes/note";
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
function appends(selected: () => string) {
  const driver = createMemoryStorage();
  const repository = createNoteStorage(driver);
  return { repository, app: createNoteAppendApplication({ reader: { read: async () => selected() }, repository, history: createAppendHistory(driver) }) };
}

it("タブで選択した文章をメモの末尾に追加し、追加できない理由はコードで返してメモを変えない", async () => {
  let selected = "選択した文章";
  const { app, repository } = appends(() => selected);
  await repository.save({ text: "元のメモ" });

  expect(await app.appendSelection({ tabId: 1 })).toEqual({ text: "元のメモ\n\n選択した文章" });

  selected = "   ";
  await expect(app.appendSelection({ tabId: 1 })).rejects.toMatchObject({ name: "NoteAppendError", reason: "no-selection" });
  selected = "x".repeat(MAX_NOTE_LENGTH);
  await expect(app.appendSelection({ tabId: 1 })).rejects.toMatchObject({ name: "NoteAppendError", reason: "too-long" });
  await expect(app.appendSelection({ tabId: -1 })).rejects.toBeInstanceOf(ValidationError);
  expect(await repository.load()).toEqual({ text: "元のメモ\n\n選択した文章" });
});

it("直前の追加は一度だけ元に戻せ、追加の後にメモが変わっていれば戻さない", async () => {
  const { app, repository } = appends(() => "");
  await repository.save({ text: "元のメモ" });
  await app.appendNote({ text: "追加" });
  expect(await app.undoAppend(undefined)).toEqual({ text: "元のメモ" });
  await expect(app.undoAppend(undefined)).rejects.toMatchObject({ name: "NoteUndoError", reason: "nothing" });

  await app.appendNote({ text: "もう一度" });
  await repository.save({ text: "その後に書き換えたメモ" });
  await expect(app.undoAppend(undefined)).rejects.toMatchObject({ name: "NoteUndoError", reason: "changed" });
  expect(await repository.load()).toEqual({ text: "その後に書き換えたメモ" });
});

// The alarm and the badge are replaced by records of what the reminder asked for.
function reminders() {
  const repository = createNoteStorage(createMemoryStorage());
  const log: string[] = [];
  const indicator = { show: async () => { log.push("show"); }, clear: async () => { log.push("clear"); } };
  const app = createNoteReminderApplication({
    repository,
    schedule: { schedule: async (minutes: number) => { log.push(`schedule ${minutes}`); }, cancel: async () => { log.push("cancel"); } },
    indicator,
  });
  return { repository, app, dismissal: createNoteReminderDismissal({ indicator }), log };
}

it("メモが変わるたびに見直しの予約をやり直し、空になったら取り消す", async () => {
  const { app, log } = reminders();
  await app.noteChanged({ text: "見直すメモ" });
  await app.noteChanged({ text: "" });
  expect(log).toEqual([`schedule ${REVIEW_DELAY_MINUTES}`, "clear", "cancel", "clear"]);
  await expect(app.noteChanged({ text: 1 })).rejects.toBeInstanceOf(ValidationError);
});

it("予約の時刻にメモがあれば知らせ、空なら知らせない。画面を開くと消す", async () => {
  const { app, repository, dismissal, log } = reminders();
  await app.remindReview(undefined);
  expect(log).toEqual([]);
  await repository.save({ text: "見直すメモ" });
  await app.remindReview(undefined);
  await dismissal.dismissReminder(undefined);
  expect(log).toEqual(["show", "clear"]);
});
