import { describe, expect, it } from "vitest";
import { createApplication } from "../src/composition/create-application";
import { createMemoryStorage } from "../src/adapters/outbound/storage/memory-storage";
import { noteStorageContract } from "../src/adapters/outbound/storage/note-storage-contract";
import { createTypedStorage } from "../src/adapters/outbound/storage/typed-storage";
import { createMockNoteApi } from "../src/adapters/outbound/mock/note-api";
import { MAX_NOTE_LENGTH } from "../src/domain/note";
import { ValidationError } from "../src/validation/note-validation";

function application() {
  return createApplication({
    storage: createTypedStorage(createMemoryStorage(), noteStorageContract),
    api: createMockNoteApi([{ id: 1, text: "API のメモ 🌱" }]),
  });
}

describe("メモ操作の Input / Output 契約", () => {
  it("未保存なら空のメモを返す", async () => {
    expect(await application().loadNote(undefined)).toEqual({ text: "" });
  });
  it.each(["こんにちは 🌱\n次のアイデア", "", "a".repeat(MAX_NOTE_LENGTH)])(
    "有効なメモを保存すると同じ内容を返し、再読み込みできる (%#)", async (text) => {
      const app = application();
      expect(await app.saveNote({ text })).toEqual({ text });
      expect(await app.loadNote(undefined)).toEqual({ text });
    },
  );
  it.each([null, undefined, [], "text", {}, { text: 42 }, { text: "a".repeat(MAX_NOTE_LENGTH + 1) }])(
    "不正な保存入力を拒否し、保存済みの内容を維持する (%#)", async (input) => {
      const app = application();
      await app.saveNote({ text: "元の内容" });
      await expect(app.saveNote(input)).rejects.toBeInstanceOf(ValidationError);
      expect(await app.loadNote(undefined)).toEqual({ text: "元の内容" });
    },
  );
  it("引数が不要な読み込み操作もバリデーションを通す", async () => {
    await expect(application().loadNote({ unexpected: true })).rejects.toBeInstanceOf(ValidationError);
  });
  it("API の入力 ID に対応するメモを返し、内部ストレージにも保存する", async () => {
    const app = application();
    expect(await app.importNote({ id: 1 })).toEqual({ text: "API のメモ 🌱" });
    expect(await app.loadNote(undefined)).toEqual({ text: "API のメモ 🌱" });
  });
  it.each([{ id: "1" }, { id: 0 }, { id: 1.5 }, { id: Infinity }, null])(
    "不正な API パラメーターを拒否する (%#)", async (input) => {
      await expect(application().importNote(input)).rejects.toBeInstanceOf(ValidationError);
    },
  );
  it("API 取得に失敗したら保存済みの内容を維持する", async () => {
    const app = application();
    await app.saveNote({ text: "保持するメモ" });
    await expect(app.importNote({ id: 404 })).rejects.toThrow("not found");
    expect(await app.loadNote(undefined)).toEqual({ text: "保持するメモ" });
  });
});
