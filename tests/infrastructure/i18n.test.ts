import { expect, it } from "vitest";
import type { MessageCatalog } from "../../src/infrastructure/i18n";
import { createCatalogTranslator, createChromeTranslator } from "../../src/infrastructure/i18n";

const en: MessageCatalog = {
  greeting: { message: "Hello, $NAME$!", placeholders: { name: { content: "$1" } } },
  pair: { message: "$A$ of $b$ costs $$5", placeholders: { a: { content: "$1" }, B: { content: "$2" } } },
  onlyEnglish: { message: "Fallback" },
};
const ja: MessageCatalog = { greeting: { message: "こんにちは、$NAME$さん", placeholders: { name: { content: "$1" } } } };

it("優先言語のカタログを選び、地域付きの言語は基本の言語にも一致させる", () => {
  expect(createCatalogTranslator({ en, ja }, ["ja-JP", "en"], "en").language).toBe("ja");
  expect(createCatalogTranslator({ en, ja }, ["fr-FR"], "en").language).toBe("en");
  expect(createCatalogTranslator({ en, pt_BR: ja }, ["pt-BR"], "en").language).toBe("pt-BR");
});

it("名前付きプレースホルダーと位置指定の置換を chrome.i18n と同じ規則で展開する", () => {
  const translator = createCatalogTranslator<"greeting" | "pair">({ en }, ["en"], "en");
  expect(translator.t("greeting", "Ada")).toBe("Hello, Ada!");
  expect(translator.t("pair", "one", "two")).toBe("one of two costs $5");
  expect(translator.t("greeting")).toBe("Hello, !");
});

it("選んだカタログにない文言は既定のカタログ、どちらにもなければキーを返す", () => {
  const translator = createCatalogTranslator<string>({ en, ja }, ["ja"], "en");
  expect(translator.t("greeting", "Ada")).toBe("こんにちは、Adaさん");
  expect(translator.t("onlyEnglish")).toBe("Fallback");
  expect(translator.t("missing")).toBe("missing");
  expect(() => createCatalogTranslator({ ja }, ["ja"], "en")).toThrow(TypeError);
});

it("カタログが言語タグを持つなら、それを表示言語とする", () => {
  const tagged: MessageCatalog = { languageTag: { message: "ja-JP" } };
  expect(createCatalogTranslator({ en, ja: tagged }, ["ja"], "en").language).toBe("ja-JP");
  const chrome = { getUILanguage: () => "en-US", getMessage: (key: string) => key === "languageTag" ? "ja" : "" };
  expect(createChromeTranslator(chrome as never).language).toBe("ja");
});

it("chrome.i18n の結果を返し、未定義の文言はキーを返す", () => {
  const translator = createChromeTranslator<string>({
    getUILanguage: () => "en-US",
    getMessage: (key: string, substitutions?: string | string[]) => key === "known" ? `value:${[substitutions].flat().join(",")}` : "",
  } as never);
  expect(translator.language).toBe("en-US");
  expect(translator.t("known", "a", "b")).toBe("value:a,b");
  expect(translator.t("unknown")).toBe("unknown");
});
