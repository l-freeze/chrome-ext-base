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
  | { ok: false; error: { name: string; message: string; reason?: string } };

// The handler's error crosses the process boundary as its name, message, and string `reason` (a
// feature's reason code), if it has one. Gateways rebuild their feature's error from these.
export class MessageError extends Error {
  override name = "MessageError";
  readonly remoteName: string;
  readonly reason: string | undefined;
  constructor(message: string, remoteName: string, reason?: string) {
    super(message);
    this.remoteName = remoteName;
    this.reason = reason;
  }
}

const marker = "chrome-ext-base/message";

// Chrome sends messages as JSON, so a payload of undefined (an operation without input) arrives with no
// payload key. The receiver treats a missing key as undefined instead of rejecting the message.
export interface MessageEnvelope { [marker]: 1; type: string; payload?: unknown }

export function envelope(type: string, payload: unknown): MessageEnvelope {
  return { [marker]: 1, type, payload };
}

export function isEnvelope(raw: unknown): raw is MessageEnvelope {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) &&
    marker in raw && raw[marker] === 1 && "type" in raw && typeof raw.type === "string";
}
