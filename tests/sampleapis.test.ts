import { describe, expect, it } from "vitest";
import type { FetchCoffeeOutput } from "../src/application/ports/coffee-api";
import { createSampleApisCoffeeApi } from "../src/adapters/outbound/http/sampleapis-coffee-api";
import { createCoffeeNoteApi } from "../src/adapters/outbound/http/coffee-note-api";
import { createMemoryStorage } from "../src/adapters/outbound/storage/memory-storage";
import { createTypedStorage } from "../src/adapters/outbound/storage/typed-storage";
import { noteStorageContract } from "../src/adapters/outbound/storage/note-storage-contract";
import { createApplication } from "../src/composition/create-application";
import { ValidationError } from "../src/validation/note-validation";

// SampleAPIs の公開データ形式に基づく固定 fixture。テストは外部通信しない。
const coffee: FetchCoffeeOutput = {
  id: 1, title: "Black Coffee", description: "Ground coffee beans steeped in hot water.",
  ingredients: ["Coffee"], image: "https://images.unsplash.com/photo-1494314671902-399b18174975",
};

function application(response: () => Promise<Response>) {
  return createApplication({
    storage: createTypedStorage(createMemoryStorage({ "quick-note": "保存済みメモ" }), noteStorageContract),
    api: createCoffeeNoteApi(createSampleApisCoffeeApi(response)),
  });
}

describe("SampleAPIs の Input / Output 契約", () => {
  it("指定 ID を coffee/hot の GET に渡し、型付き Output を返す", async () => {
    const api = createSampleApisCoffeeApi(async (url, init) => {
      if (url.href !== "https://api.sampleapis.com/coffee/hot/1" || init.method !== "GET") {
        return new Response(null, { status: 404 });
      }
      return Response.json({ ...coffee, extra: "ignored" });
    });
    expect(await api.fetchCoffee({ id: 1 })).toEqual(coffee);
  });

  it("コーヒーをメモに変換して返し、保存後にも読み出せる", async () => {
    const app = application(async () => Response.json(coffee));
    const output = { text: "Black Coffee\n\nGround coffee beans steeped in hot water.\n\n材料: Coffee" };
    expect(await app.importNote({ id: 1 })).toEqual(output);
    expect(await app.loadNote(undefined)).toEqual(output);
  });

  it.each([null, {}, { ...coffee, title: 42 }, { ...coffee, ingredients: [42] }, { ...coffee, id: "1" }])(
    "不正なレスポンスを拒否し、保存済みのメモを維持する (%#)", async (body) => {
      const app = application(async () => Response.json(body));
      await expect(app.importNote({ id: 1 })).rejects.toBeInstanceOf(ValidationError);
      expect(await app.loadNote(undefined)).toEqual({ text: "保存済みメモ" });
    },
  );

  it.each([404, 429, 500])("HTTP %i の失敗では保存済みのメモを維持する", async (status) => {
    const app = application(async () => new Response(null, { status }));
    await expect(app.importNote({ id: 1 })).rejects.toMatchObject({ name: "HttpError", status });
    expect(await app.loadNote(undefined)).toEqual({ text: "保存済みメモ" });
  });

  it("ネットワークの失敗を通知し、保存済みメモを維持する", async () => {
    const app = application(async () => { throw new TypeError("Network failed"); });
    await expect(app.importNote({ id: 1 })).rejects.toThrow("Network failed");
    expect(await app.loadNote(undefined)).toEqual({ text: "保存済みメモ" });
  });

  it("変換後に長すぎるメモになるレスポンスは拒否する", async () => {
    const app = application(async () => Response.json({ ...coffee, description: "x".repeat(2001) }));
    await expect(app.importNote({ id: 1 })).rejects.toBeInstanceOf(ValidationError);
    expect(await app.loadNote(undefined)).toEqual({ text: "保存済みメモ" });
  });
});
