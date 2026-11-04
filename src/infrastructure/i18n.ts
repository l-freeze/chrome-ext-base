// The chrome.i18n messages.json shape. Placeholders map $NAME$ in a message to content such as "$1".
export interface MessageCatalog {
  [key: string]: { message: string; description?: string; placeholders?: { [name: string]: { content: string; example?: string } } };
}

// Each catalog names its own language, because the browser UI language can differ from the
// catalog chrome.i18n actually selected (it falls back to default_locale for unsupported languages).
export const LANGUAGE_TAG_KEY = "languageTag";

export interface Translator<Key extends string> {
  readonly language: string;
  t(key: Key, ...substitutions: string[]): string;
}

// A missing message renders its key, so the gap is visible instead of an empty label.
export function createChromeTranslator<Key extends string>(i18n: Pick<typeof chrome.i18n, "getMessage" | "getUILanguage">): Translator<Key> {
  return {
    language: i18n.getMessage(LANGUAGE_TAG_KEY) || i18n.getUILanguage(),
    t: (key, ...substitutions) => i18n.getMessage(key, substitutions) || key,
  };
}

function format(entry: MessageCatalog[string], substitutions: readonly string[]): string {
  const placeholders = new Map(Object.entries(entry.placeholders ?? {}).map(([name, value]) => [name.toLowerCase(), value.content]));
  const expanded = entry.message.replace(/\$([a-z0-9_@]+)\$/gi, (match, name: string) => placeholders.get(name.toLowerCase()) ?? match);
  return expanded.replace(/\$\$|\$([1-9])/g, (_match, index: string | undefined) => index === undefined ? "$" : substitutions[Number(index) - 1] ?? "");
}

// Mirrors chrome.i18n for pages without the extension API, such as the Vite preview.
// Locale folders use underscores ("pt_BR"); language tags use hyphens ("pt-BR").
export function createCatalogTranslator<Key extends string>(
  catalogs: Readonly<Record<string, MessageCatalog>>, preferred: readonly string[], fallback: string,
): Translator<Key> {
  const fallbackCatalog = catalogs[fallback];
  if (!fallbackCatalog) throw new TypeError(`The fallback locale "${fallback}" has no catalog.`);
  const locale = preferred.map((tag) => tag.replace("-", "_"))
    .flatMap((tag) => [tag, tag.split("_")[0]!])
    .find((candidate) => Object.hasOwn(catalogs, candidate)) ?? fallback;
  const catalog = catalogs[locale]!;
  return {
    language: catalog[LANGUAGE_TAG_KEY]?.message ?? locale.replace("_", "-"),
    t(key, ...substitutions) {
      const entry = Object.hasOwn(catalog, key) ? catalog[key] : Object.hasOwn(fallbackCatalog, key) ? fallbackCatalog[key] : undefined;
      return entry ? format(entry, substitutions) : key;
    },
  };
}
