// Runs a content script built from src/content (output: content/<name>.js) in a tab. Unlike a function
// passed to executeScript, a bundled script may import the extension's code, such as the message client,
// and send requests back to the worker. Needs `scripting` and access to the tab (activeTab or host permission).
export interface PageScripts {
  // Resolves false when the page cannot run it (browser pages, the Web Store, or no access to the tab).
  run(tabId: number, file: string): Promise<boolean>;
}

export function createPageScripts(scripting: Pick<typeof chrome.scripting, "executeScript">): PageScripts {
  return {
    async run(tabId, file) {
      if (!/^content\/[\w-]+\.js$/.test(file)) throw new TypeError(`"${file}" is not a built content script (content/<name>.js).`);
      try {
        await scripting.executeScript({ target: { tabId }, files: [file] });
        return true;
      } catch {
        return false;
      }
    },
  };
}
