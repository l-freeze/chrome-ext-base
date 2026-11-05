// Sample: what the welcome page shows about the extension's keyboard shortcuts.
export interface Shortcut {
  name: string;          // the key under `commands` in the manifest
  description: string;   // localized by Chrome; empty for _execute_action in some versions
  keys: string;          // the assigned keys, or "" when Chrome assigned none
}

export interface ShortcutGuide {
  list(): Promise<Shortcut[]>;
  // Opens Chrome's own page where the user changes the keys.
  openSettings(): Promise<void>;
}
