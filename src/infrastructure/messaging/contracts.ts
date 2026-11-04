import type { Validator } from "../../lib/validation";

// A request/response pair exchanged with the service worker. Both validators are required.
export interface MessageContract<Request, Response> {
  type: string;
  request: Validator<Request>;
  response: Validator<Response>;
}

// Validated facts about where a message came from. Handlers decide whether they need them.
export interface MessageSender {
  url: string | undefined;
  tabId: number | undefined;
}

export interface MessageTransport {
  send(message: unknown): Promise<unknown>;
}

export type MessageReply =
  | { ok: true; value: unknown }
  | { ok: false; error: { name: string; message: string } };

// The handler's error crosses the process boundary as name and message only.
export class MessageError extends Error {
  override name = "MessageError";
  constructor(message: string, public readonly remoteName: string) {
    super(message);
  }
}

const marker = "chrome-ext-base/message";

export interface MessageEnvelope { [marker]: 1; type: string; payload: unknown }

export function envelope(type: string, payload: unknown): MessageEnvelope {
  return { [marker]: 1, type, payload };
}

export function isEnvelope(raw: unknown): raw is MessageEnvelope {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) &&
    marker in raw && raw[marker] === 1 && "type" in raw && typeof raw.type === "string" && "payload" in raw;
}
