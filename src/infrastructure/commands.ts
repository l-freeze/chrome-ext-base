// Keyboard shortcuts declared under `commands` in the manifest. Like context menus, the listener must be
// registered at the worker's top level so the command that woke a restarted worker reaches it.
export interface CommandInvocation {
  tabId: number | undefined;
  url: string | undefined;
}

export interface CommandItem {
  name: string;   // the key under `commands` in the manifest
  run(invocation: CommandInvocation): Promise<void>;
}

export function registerCommands(
  commands: Pick<typeof chrome.commands, "onCommand">, items: readonly CommandItem[], onError: (error: unknown) => void,
) {
  const names = new Set<string>();
  for (const item of items) {
    if (names.has(item.name)) throw new TypeError(`Command "${item.name}" is duplicated.`);
    names.add(item.name);
  }
  commands.onCommand.addListener((name, tab) => {
    const item = items.find((candidate) => candidate.name === name);
    if (!item) return;
    const tabId = tab?.id;
    void item.run({
      tabId: typeof tabId === "number" && Number.isSafeInteger(tabId) && tabId >= 0 ? tabId : undefined,
      url: typeof tab?.url === "string" ? tab.url : undefined,
    }).catch(onError);
  });
}
