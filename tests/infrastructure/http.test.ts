import { describe, expect, it } from "vitest";
import type { Fetch } from "../../src/infrastructure/http";
import { createHttpClient, createRetryPolicy, getJson, HttpError, requestJson, retryAfterMs, TransportError } from "../../src/infrastructure/http";

const endpoint = "https://example.test/resource";

// A fetch that answers from a queue and records each request.
function scripted(...answers: Array<Response | Error | "hang">) {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetch: Fetch = (url, init) => {
    requests.push({ url: String(url), init });
    const answer = answers.shift() ?? new Response(null, { status: 599 });
    if (answer === "hang") {
      return new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true }));
    }
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  };
  return { fetch, requests };
}

// Waits are recorded instead of slept; the clock advances by each wait.
function client(fetch: Fetch, timeoutMs = 1_000) {
  let clock = 0;
  const waits: number[] = [];
  const http = createHttpClient({
    fetch, timeoutMs, now: () => clock,
    sleep: async (ms, signal) => { if (signal?.aborted) throw signal.reason; waits.push(ms); clock += ms; },
  });
  return { http, waits };
}

describe("送信と JSON", () => {
  it("指定 URL に JSON を GET 要求し、その値を返す", async () => {
    const { fetch, requests } = scripted(Response.json({ value: 42 }));
    expect(await getJson(client(fetch).http, endpoint)).toEqual({ value: 42 });
    expect(requests[0]!.url).toBe(endpoint);
    expect(requests[0]!.init.method).toBe("GET");
    expect(new Headers(requests[0]!.init.headers).get("Accept")).toBe("application/json");
  });
  it("本文付きの要求は JSON で送り、204 は値なしで返す", async () => {
    const { fetch, requests } = scripted(new Response(null, { status: 204 }));
    expect(await requestJson(client(fetch).http, { url: endpoint, method: "POST", json: { name: "example" } })).toBeUndefined();
    expect(requests[0]!.init.method).toBe("POST");
    expect(requests[0]!.init.body).toBe('{"name":"example"}');
    expect(new Headers(requests[0]!.init.headers).get("Content-Type")).toBe("application/json");
  });
  it("2xx 以外は状態コード付きの HttpError、JSON でない成功は SyntaxError を返す", async () => {
    await expect(getJson(client(scripted(new Response(null, { status: 404 })).fetch).http, endpoint))
      .rejects.toMatchObject({ name: "HttpError", status: 404 });
    await expect(getJson(client(scripted(new Response("not JSON")).fetch).http, endpoint)).rejects.toBeInstanceOf(SyntaxError);
  });
  it("send は状態コードにかかわらず応答を返す", async () => {
    const response = await client(scripted(new Response(null, { status: 503 })).fetch).http.send({ url: endpoint });
    expect(response.status).toBe(503);
  });
});

describe("通信エラーの種類と中断", () => {
  it("通信失敗・時間切れ・中断を種類で区別し、元のエラーを cause に残す", async () => {
    const failure = new TypeError("Failed to fetch");
    const network = await getJson(client(scripted(failure).fetch).http, endpoint).catch((error: unknown) => error);
    expect(network).toBeInstanceOf(TransportError);
    expect(network).toMatchObject({ kind: "network", cause: failure });
    await expect(getJson(client(scripted("hang").fetch, 20).http, endpoint)).rejects.toMatchObject({ kind: "timeout" });
    const controller = new AbortController();
    const pending = getJson(client(scripted("hang").fetch).http, endpoint, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: "aborted" });
  });
  it("中断済みの signal では送信しない", async () => {
    const { fetch, requests } = scripted(Response.json({}));
    await expect(getJson(client(fetch).http, endpoint, { signal: AbortSignal.abort() })).rejects.toMatchObject({ kind: "aborted" });
    expect(requests).toEqual([]);
  });
});

describe("再試行", () => {
  it("方針に従い、通信エラーと 5xx の後に間隔を広げて再試行する", async () => {
    const { fetch, requests } = scripted(new TypeError("offline"), new Response(null, { status: 503 }), Response.json({ ok: true }));
    const { http, waits } = client(fetch);
    expect(await getJson(http, endpoint, { retry: createRetryPolicy({ baseDelayMs: 100 }) })).toEqual({ ok: true });
    expect(requests).toHaveLength(3);
    expect(waits).toEqual([100, 200]);
  });
  it("Retry-After の秒数と日時を優先し、長すぎる待ちは再試行せず応答を返す", async () => {
    const date = new Date(Date.now() + 3_000).toUTCString();
    const { fetch } = scripted(
      new Response(null, { status: 429, headers: { "Retry-After": "2" } }),
      new Response(null, { status: 503, headers: { "Retry-After": date } }),
      Response.json({ ok: true }),
    );
    const { http, waits } = client(fetch);
    expect(await getJson(http, endpoint, { retry: createRetryPolicy() })).toEqual({ ok: true });
    expect(waits[0]).toBe(2_000);
    expect(waits[1]).toBeGreaterThan(1_000);

    const long = scripted(new Response(null, { status: 503, headers: { "Retry-After": "3600" } }));
    await expect(getJson(client(long.fetch).http, endpoint, { retry: createRetryPolicy() })).rejects.toMatchObject({ status: 503 });
    expect(long.requests).toHaveLength(1);
  });
  it("回数と時間の上限で止め、最後の失敗を返す", async () => {
    const byCount = scripted(...Array.from({ length: 5 }, () => new Response(null, { status: 500 })));
    await expect(getJson(client(byCount.fetch).http, endpoint, { retry: createRetryPolicy({ maxRetries: 2, baseDelayMs: 1 }) }))
      .rejects.toMatchObject({ status: 500 });
    expect(byCount.requests).toHaveLength(3);
    const byTime = scripted(...Array.from({ length: 5 }, () => new TypeError("offline")));
    await expect(getJson(client(byTime.fetch, 100).http, endpoint, { retry: createRetryPolicy({ maxRetries: 9, baseDelayMs: 400, maxElapsedMs: 1_000 }) }))
      .rejects.toMatchObject({ kind: "network" });
    expect(byTime.requests).toHaveLength(2);
  });
  it("時間の上限には次の試行の時間切れも含め、応答しない相手でも上限内で終える", async () => {
    const { fetch, requests } = scripted("hang", "hang", "hang");
    const http = createHttpClient({ fetch, timeoutMs: 60 });
    const started = Date.now();
    await expect(getJson(http, endpoint, { retry: createRetryPolicy({ maxRetries: 5, baseDelayMs: 5, maxElapsedMs: 150 }) }))
      .rejects.toMatchObject({ kind: "timeout" });
    expect(Date.now() - started).toBeLessThan(150);
    expect(requests).toHaveLength(2);
  });
  it("GET 以外と、再試行しない状態コードは方針があっても繰り返さない", async () => {
    const post = scripted(new Response(null, { status: 503 }), Response.json({}));
    await expect(requestJson(client(post.fetch).http, { url: endpoint, method: "POST", json: {} }, createRetryPolicy()))
      .rejects.toMatchObject({ status: 503 });
    expect(post.requests).toHaveLength(1);
    const notFound = scripted(new Response(null, { status: 404 }), Response.json({}));
    await expect(getJson(client(notFound.fetch).http, endpoint, { retry: createRetryPolicy() })).rejects.toMatchObject({ status: 404 });
    expect(notFound.requests).toHaveLength(1);
  });
  it("待っている間の中断は再試行せず aborted を返す", async () => {
    const { fetch } = scripted(new Response(null, { status: 503 }), Response.json({}));
    const controller = new AbortController();
    const http = createHttpClient({ fetch, sleep: async () => { controller.abort(); throw controller.signal.reason; } });
    await expect(getJson(http, endpoint, { signal: controller.signal, retry: createRetryPolicy() })).rejects.toMatchObject({ kind: "aborted" });
  });
});

it("Retry-After の秒数と HTTP 日時を読み、不正な値は無視する", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  expect(retryAfterMs(new Headers({ "Retry-After": "5" }), now)).toBe(5_000);
  expect(retryAfterMs(new Headers({ "Retry-After": "Thu, 01 Jan 2026 00:00:30 GMT" }), now)).toBe(30_000);
  expect(retryAfterMs(new Headers({ "Retry-After": "soon" }), now)).toBeNull();
  expect(retryAfterMs(new Headers(), now)).toBeNull();
  expect(new HttpError(500).status).toBe(500);
});
