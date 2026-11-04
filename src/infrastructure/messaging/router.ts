import type { MessageContract, MessageReply, MessageSender } from "./contracts";
import { isEnvelope } from "./contracts";

export interface MessageRouter {
  handle<Request, Response>(
    contract: MessageContract<Request, Response>,
    handler: (input: Request, sender: MessageSender) => Promise<Response>,
  ): void;
  // Returns undefined for messages that are not addressed to this router.
  dispatch(message: unknown, sender: MessageSender): Promise<MessageReply> | undefined;
}

type Route = { contract: MessageContract<unknown, unknown>; handler: (input: unknown, sender: MessageSender) => Promise<unknown> };

export function createMessageRouter(): MessageRouter {
  const routes = new Map<string, Route>();
  return {
    handle(contract, handler) {
      if (typeof contract.request?.parse !== "function" || typeof contract.response?.parse !== "function") {
        throw new TypeError("Messages require both request and response validators.");
      }
      if (routes.has(contract.type)) throw new TypeError(`Message type "${contract.type}" is already handled.`);
      routes.set(contract.type, { contract, handler } as unknown as Route);
    },
    dispatch(message, sender) {
      if (!isEnvelope(message)) return undefined;
      const route = routes.get(message.type);
      return (async (): Promise<MessageReply> => {
        try {
          if (!route) throw new TypeError(`No handler for message type "${message.type}".`);
          const input = route.contract.request.parse(message.payload);
          const value = route.contract.response.parse(await route.handler(input, sender));
          return { ok: true, value };
        } catch (error) {
          return { ok: false, error: {
            name: error instanceof Error ? error.name : "Error",
            message: error instanceof Error ? error.message : String(error),
          } };
        }
      })();
    },
  };
}
