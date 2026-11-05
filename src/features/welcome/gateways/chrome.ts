import type { Shortcut, ShortcutGuide } from "../ports";
import { ValidationError } from "../../../lib/validation";

export function createChromeShortcutGuide(
  commands: Pick<typeof chrome.commands, "getAll">, tabs: Pick<typeof chrome.tabs, "create">,
): ShortcutGuide {
  return {
    async list() {
      const all = await commands.getAll();
      if (!Array.isArray(all)) throw new ValidationError("Chrome returned no shortcut list.");
      return all.flatMap((command): Shortcut[] => typeof command.name === "string"
        ? [{ name: command.name, description: typeof command.description === "string" ? command.description : "", keys: typeof command.shortcut === "string" ? command.shortcut : "" }]
        : []);
    },
    async openSettings() { await tabs.create({ url: "chrome://extensions/shortcuts" }); },
  };
}

// The browser preview has no commands API; it shows the manifest's suggested keys as an example.
export function createPreviewShortcutGuide(): ShortcutGuide {
  return {
    list: async () => [
      { name: "_execute_action", description: "", keys: "Ctrl+Shift+Y" },
      { name: "append-selection", description: "", keys: "Ctrl+Shift+U" },
    ],
    async openSettings() {},
  };
}
