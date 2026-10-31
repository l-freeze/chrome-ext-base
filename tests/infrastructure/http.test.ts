import { expect, it } from "vitest";
import { getJson } from "../../src/infrastructure/http";

const endpoint = new URL("https://example.test/resource");

it("指定 URL に JSON を GET 要求し、その値を返す", async () => {
  const payload = { value: 42, items: ["example"] };
  const result = await getJson(endpoint, async (url, init) => {
    expect(url.href).toBe(endpoint.href);
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
    return Response.json(payload);
  });
  expect(result).toEqual(payload);
});

it("HTTP エラーをステータス付きで返す", async () => {
  await expect(getJson(endpoint, async () => new Response(null, { status: 503 })))
    .rejects.toMatchObject({ name: "HttpError", status: 503 });
});

it("通信失敗を呼び出し元へ返す", async () => {
  const error = new TypeError("Network unavailable");
  await expect(getJson(endpoint, async () => { throw error; })).rejects.toBe(error);
});

it("JSON でない成功レスポンスを拒否する", async () => {
  await expect(getJson(endpoint, async () => new Response("not JSON"))).rejects.toBeInstanceOf(SyntaxError);
});
