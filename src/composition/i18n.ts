import type en from "../../public/_locales/en/messages.json";
import type { MessageCatalog, Translator } from "../infrastructure/i18n";
import { createCatalogTranslator, createChromeTranslator } from "../infrastructure/i18n";

// The default locale's catalog defines the keys; every locale must provide the same keys.
export type MessageKey = keyof typeof en;
export const DEFAULT_LOCALE = "en";

// Extensions read _locales through chrome.i18n. The browser preview loads the same catalogs lazily; the
// catalog chunks are still emitted (so a built dist/ can be previewed) but the extension never loads them.
export async function loadTranslator(): Promise<Translator<MessageKey>> {
  if (typeof globalThis.chrome?.i18n?.getMessage === "function") return createChromeTranslator(chrome.i18n);
  const catalogs = import.meta.glob<MessageCatalog>("../../public/_locales/*/messages.json", { import: "default" });
  const entries = await Promise.all(Object.entries(catalogs).map(async ([path, load]) => [path.split("/").at(-2)!, await load()] as const));
  return createCatalogTranslator(Object.fromEntries(entries), navigator.languages, DEFAULT_LOCALE);
}
