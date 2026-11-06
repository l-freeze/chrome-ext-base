// Sample: a welcome page opened once, when the extension is installed (not on updates).
import { createSettings } from "./settings";
import type { Environment } from "./environment";
import type { WorkerRegistry } from "./worker";
import { createChromeShortcutGuide, createPreviewShortcutGuide } from "../features/welcome/gateways/chrome";

export function createWelcomeScreen(environment: Environment) {
  const settings = createSettings(environment);
  return {
    settings: settings.actions,
    settingsChanges: settings.changes,
    shortcuts: environment.extension ? createChromeShortcutGuide(chrome.commands, chrome.tabs) : createPreviewShortcutGuide(),
    preview: !environment.extension,
    // The settings page of this build (the variants name it differently), read from the manifest.
    optionsHref: `./${environment.extension ? chrome.runtime.getManifest().options_ui?.page ?? "options.html" : "options.html"}`,
  };
}

export function registerWelcomeWorker(worker: WorkerRegistry) {
  worker.installs.push({
    name: "welcome.open",
    async run({ reason }) {
      // Updates and Chrome updates also fire onInstalled; only a new install opens the page.
      if (reason === "install") await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    },
  });
}
