import { describe, expect, it } from "vitest";
import { createNoteApplication } from "../../../src/features/notes/compose";
import { createMemoryStorage } from "../../../src/infrastructure/storage/drivers/memory-storage";
import { createNoteStorage } from "../../../src/features/notes/adapters/outbound/persistence/note-storage";
import { createMockNoteSource } from "../../../src/features/notes/adapters/outbound/sources/mock-note-source";
import { MAX_NOTE_LENGTH } from "../../../src/features/notes/domain/note";
import { ValidationError } from "../../../src/shared/validation/primitives";

function application() {
  return createNoteApplication({
    repository: createNoteStorage(createMemoryStorage()),
    source: createMockNoteSource([{ id: 1, text: "API のメモ 🌱" }]),
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
