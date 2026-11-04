import type { MessageContract, MessageReply, MessageTransport } from "./contracts";
import { envelope, MessageError } from "./contracts";

export interface MessageClient {
  request<Request, Response>(contract: MessageContract<Request, Response>, input: Request): Promise<Response>;
}

function parseReply(raw: unknown): MessageReply {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "ok" in raw) {
    if (raw.ok === true && "value" in raw) return { ok: true, value: raw.value };
    if (raw.ok === false && "error" in raw && typeof raw.error === "object" && raw.error !== null &&
        "name" in raw.error && typeof raw.error.name === "string" &&
        "message" in raw.error && typeof raw.error.message === "string") {
      const reason = "reason" in raw.error && typeof raw.error.reason === "string" ? raw.error.reason : undefined;
      return { ok: false, error: { name: raw.error.name, message: raw.error.message, ...(reason !== undefined ? { reason } : {}) } };
    }
  }
  throw new MessageError("The service worker returned an invalid reply.", "InvalidReply");
}

export function createMessageClient(transport: MessageTransport): MessageClient {
  return {
    async request(contract, input) {
      const payload = contract.request.parse(input);
      const reply = parseReply(await transport.send(envelope(contract.type, payload)));
      if (!reply.ok) throw new MessageError(reply.error.message, reply.error.name, reply.error.reason);
      return contract.response.parse(reply.value);
    },
  };
}
