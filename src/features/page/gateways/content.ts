// The in-page half of the Chrome gateway: chrome.ts injects this function with scripting.executeScript.
// Chrome serializes it into the active page's isolated world.
// Keep it self-contained: no imports or values from the extension's scope.
export function readPage(includeSelection: boolean) {
  const editing = document.activeElement?.closest("input, textarea, [contenteditable]:not([contenteditable='false'])");
  const selected = includeSelection && !editing ? document.getSelection()?.toString() ?? "" : "";
  return {
    title: document.title.slice(0, 512),
    url: location.href,
    selection: selected.slice(0, 2000),
    selectionTruncated: selected.length > 2000,
  };
}
