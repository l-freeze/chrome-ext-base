import { describe, expect, it } from "vitest";
import { createSampleApisCoffeeClient } from "../../../src/integrations/sampleapis/coffee";
import { createSampleApisCoffeeSource } from "../../../src/features/notes/gateways/coffee";
import { createMemoryStorage } from "../../../src/infrastructure/storage/drivers/memory";
import { createNoteStorage } from "../../../src/features/notes/gateways/storage";
import { createNoteApplication } from "../../../src/features/notes/compose";
import { ValidationError } from "../../../src/lib/validation";

import { coffee } from "../../fixtures/sampleapis-coffee";

function application(response: () => Promise<Response>) {
  return createNoteApplication({
    repository: createNoteStorage(createMemoryStorage({ "quick-note": "保存済みメモ" })),
    source: createSampleApisCoffeeSource(createSampleApisCoffeeClient(response)),
  });
}

describe("SampleAPIs からメモへの取り込み契約", () => {
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
