import { describe, expect, it } from "vitest";
import type { MessageContract, MessageSender } from "../../src/infrastructure/messaging/contracts";
import { MessageError } from "../../src/infrastructure/messaging/contracts";
import { createMessageClient } from "../../src/infrastructure/messaging/client";
import { createMessageRouter } from "../../src/infrastructure/messaging/router";
import { listenChromeMessages } from "../../src/infrastructure/messaging/drivers/chrome";

const sender: MessageSender = { url: "chrome-extension://example/page.html", tabId: undefined };
const double: MessageContract<{ value: number }, { doubled: number }> = {
  type: "example.double",
  request: { parse(raw) {
    if (typeof raw !== "object" || raw === null || !("value" in raw) || typeof raw.value !== "number") throw new TypeError("Expected { value: number }");
    return { value: raw.value };
  } },
  response: { parse(raw) {
    if (typeof raw !== "object" || raw === null || !("doubled" in raw) || typeof raw.doubled !== "number") throw new TypeError("Expected { doubled: number }");
    return { doubled: raw.doubled };
  } },
};

function connect(handler: (input: { value: number }) => Promise<{ doubled: number }>) {
  const router = createMessageRouter();
  router.handle(double, handler);
  const client = createMessageClient({ send: async (message) => router.dispatch(message, sender) });
  return { router, client };
}

describe("メッセージの Request / Response 契約", () => {
  it("検証済みの Request を処理に渡し、検証済みの Response を返す", async () => {
    const { client } = connect(async (input) => ({ doubled: input.value * 2 }));
    expect(await client.request(double, { value: 21 })).toEqual({ doubled: 42 });
  });
  it("不正な Request は送信せず、受信側でも処理を実行しない", async () => {
    const received: unknown[] = [];
    const router = createMessageRouter();
    router.handle(double, async (input) => { received.push(input); return { doubled: 0 }; });
    const client = createMessageClient({ send: async (message) => router.dispatch(message, sender) });
    // @ts-expect-error The contract fixes the request type.
    await expect(client.request(double, { value: "21" })).rejects.toBeInstanceOf(TypeError);
    const reply = await router.dispatch({ "chrome-ext-base/message": 1, type: double.type, payload: { value: "21" } }, sender);
    expect(reply).toMatchObject({ ok: false, error: { name: "TypeError" } });
    expect(received).toEqual([]);
  });
  it("処理の失敗を名前とメッセージ付きの MessageError として返す", async () => {
    const { client } = connect(async () => { throw new RangeError("Too large"); });
    const error = await client.request(double, { value: 1 }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MessageError);
    expect(error).toMatchObject({ message: "Too large", remoteName: "RangeError" });
  });
  it("処理のエラーが持つ理由のコードも呼び出し側へ渡す", async () => {
    const { client } = connect(async () => { throw Object.assign(new Error("Quota exceeded"), { name: "LimitError", reason: "quota" }); });
    await expect(client.request(double, { value: 1 })).rejects.toMatchObject({ remoteName: "LimitError", reason: "quota" });
  });
  it("Response の契約を満たさない結果を成功として返さない", async () => {
    // @ts-expect-error The handler must return the contract's response type.
    const { client } = connect(async () => ({ doubled: "42" }));
    await expect(client.request(double, { value: 21 })).rejects.toMatchObject({ remoteName: "TypeError" });
  });
  it("不正な返信を拒否する", async () => {
    const client = createMessageClient({ send: async () => ({ unexpected: true }) });
    await expect(client.request(double, { value: 1 })).rejects.toMatchObject({ remoteName: "InvalidReply" });
  });
  it("自分宛てでないメッセージは処理せず、未登録の種類はエラーを返す", async () => {
    const { router } = connect(async () => ({ doubled: 0 }));
    expect(router.dispatch({ type: double.type, payload: { value: 1 } }, sender)).toBeUndefined();
    expect(router.dispatch("ping", sender)).toBeUndefined();
    expect(await router.dispatch({ "chrome-ext-base/message": 1, type: "unknown", payload: null }, sender))
      .toMatchObject({ ok: false, error: { name: "TypeError" } });
  });
  it("Request / Response の片方だけ、または同じ種類の重複登録は拒否する", () => {
    const router = createMessageRouter();
    const { response: _response, ...requestOnly } = double;
    // @ts-expect-error The response validator is required.
    expect(() => router.handle(requestOnly, async () => ({ doubled: 0 }))).toThrow(TypeError);
    router.handle(double, async () => ({ doubled: 0 }));
    expect(() => router.handle(double, async () => ({ doubled: 0 }))).toThrow(TypeError);
  });
});

describe("Chrome の受信口", () => {
  type Listener = (message: unknown, sender: chrome.runtime.MessageSender, respond: (reply: unknown) => void) => boolean;
  function runtime() {
    const listeners = new Set<Listener>();
    return {
      id: "own-extension",
      onMessage: { addListener: (l: Listener) => { listeners.add(l); }, removeListener: (l: Listener) => { listeners.delete(l); } },
      emit: (message: unknown, from: chrome.runtime.MessageSender) => new Promise<{ handled: boolean; reply?: unknown }>((resolve) => {
        for (const listener of listeners) {
          const handled = listener(message, from, (reply) => resolve({ handled, reply }));
          if (!handled) resolve({ handled });
        }
        if (listeners.size === 0) resolve({ handled: false });
      }),
    };
  }
  const message = { "chrome-ext-base/message": 1, type: double.type, payload: { value: 2 } };

  it("自分の拡張からの要求に非同期で返信し、送信元を渡す", async () => {
    const api = runtime();
    const seen: MessageSender[] = [];
    const router = createMessageRouter();
    router.handle(double, async (input, from) => { seen.push(from); return { doubled: input.value * 2 }; });
    listenChromeMessages(api as never, router);
    const result = await api.emit(message, { id: "own-extension", url: "https://example.test/", tab: { id: 5 } as chrome.tabs.Tab });
    expect(result).toEqual({ handled: true, reply: { ok: true, value: { doubled: 4 } } });
    expect(seen).toEqual([{ url: "https://example.test/", tabId: 5 }]);
  });
  it("他の拡張からの要求と、解除後の要求は処理しない", async () => {
    const api = runtime();
    const router = createMessageRouter();
    let calls = 0;
    router.handle(double, async () => { calls++; return { doubled: 0 }; });
    const stop = listenChromeMessages(api as never, router);
    expect(await api.emit(message, { id: "other-extension" })).toEqual({ handled: false });
    stop();
    expect(await api.emit(message, { id: "own-extension" })).toEqual({ handled: false });
    expect(calls).toBe(0);
  });
});
