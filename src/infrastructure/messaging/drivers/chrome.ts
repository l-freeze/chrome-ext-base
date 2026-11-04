import type { MessageSender, MessageTransport } from "../contracts";
import type { MessageRouter } from "../router";

export function createChromeTransport(runtime: Pick<typeof chrome.runtime, "sendMessage">): MessageTransport {
  return { send: (message) => runtime.sendMessage(message) };
}

// Register at the worker's top level so a restarted worker receives the waking message.
export function listenChromeMessages(
  runtime: Pick<typeof chrome.runtime, "id" | "onMessage">, router: MessageRouter,
): () => void {
  const listener = (message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (reply: unknown) => void) => {
    // Only this extension's own pages and scripts may call its handlers.
    if (sender.id !== runtime.id) return false;
    const tabId = sender.tab?.id;
    const from: MessageSender = {
      url: typeof sender.url === "string" ? sender.url : undefined,
      tabId: typeof tabId === "number" && Number.isSafeInteger(tabId) && tabId >= 0 ? tabId : undefined,
    };
    const reply = router.dispatch(message, from);
    if (!reply) return false;
    void reply.then(sendResponse);
    return true; // Keep the channel open for the asynchronous reply.
  };
  runtime.onMessage.addListener(listener);
  return () => runtime.onMessage.removeListener(listener);
}
