import type { SelectionReader } from "../ports";
import { ValidationError } from "../../../lib/validation";

// Runs inside the page, so it stays self-contained. Selections inside form fields and editors are not read.
export function readSelection(): string {
  const editing = document.activeElement?.closest("input, textarea, [contenteditable]:not([contenteditable='false'])");
  return editing ? "" : document.getSelection()?.toString() ?? "";
}

// Needs access to the tab: activeTab, which Chrome grants when the user presses the extension's shortcut.
export function createTabSelection(scripting: Pick<typeof chrome.scripting, "executeScript">): SelectionReader {
  return {
    async read(input) {
      const [result] = await scripting.executeScript({ target: { tabId: input.tabId }, func: readSelection });
      if (typeof result?.result !== "string") throw new ValidationError("The page returned no selection text.");
      return result.result;
    },
  };
}
