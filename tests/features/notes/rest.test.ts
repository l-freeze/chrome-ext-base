import { describe, expect, it } from "vitest";
import { createRestNoteSource } from "../../../src/features/notes/gateways/rest";
import { ValidationError } from "../../../src/lib/validation";

describe("REST API の Input / Output 契約", () => {
  it("型付き入力を GET リクエストにし、検証済みのレスポンスを返す", async () => {
    const api = createRestNoteSource({
      baseUrl: "https://example.test/api/v1",
      fetch: async (url, init) => {
        if (url.href !== "https://example.test/api/v1/notes/7" || init.method !== "GET") {
          return new Response(null, { status: 404 });
        }
        return Response.json({ id: 7, text: "REST のレスポンス", extra: "ignored" });
      },
    });
    expect(await api.fetchNote({ id: 7 })).toEqual({ id: 7, text: "REST のレスポンス" });
  });
  it.each([null, {}, { id: "7", text: "memo" }, { id: 7, text: 42 }])(
    "レスポンスが Output 型に適合しなければ拒否する (%#)", async (body) => {
      const api = createRestNoteSource({ baseUrl: "https://example.test/", fetch: async () => Response.json(body) });
      await expect(api.fetchNote({ id: 7 })).rejects.toBeInstanceOf(ValidationError);
    },
  );
  it("HTTP エラーのステータスを呼び出し元へ返す", async () => {
    const api = createRestNoteSource({ baseUrl: "https://example.test/", fetch: async () => new Response(null, { status: 503 }) });
    await expect(api.fetchNote({ id: 7 })).rejects.toMatchObject({ name: "HttpError", status: 503 });
  });
  it("通信エラーを成功した Output として扱わない", async () => {
    const api = createRestNoteSource({
      baseUrl: "https://example.test/", fetch: async () => { throw new Error("Network unavailable"); },
    });
    await expect(api.fetchNote({ id: 7 })).rejects.toThrow("Network unavailable");
  });
  it("JSON でない成功レスポンスは拒否する", async () => {
    const api = createRestNoteSource({ baseUrl: "https://example.test/", fetch: async () => new Response("not JSON") });
    await expect(api.fetchNote({ id: 7 })).rejects.toBeInstanceOf(SyntaxError);
  });
});
