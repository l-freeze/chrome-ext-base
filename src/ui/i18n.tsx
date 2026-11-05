import { createContext, useContext } from "solid-js";
import type { JSX } from "solid-js";
import type en from "../../public/_locales/en/messages.json";
import type { Translator } from "../infrastructure/i18n";

// The UI owns its wording, so it defines the message keys from the default locale's catalog.
// composition/i18n.ts derives the same type from the same catalog for translators it creates.
export type MessageKey = keyof typeof en;
export type UiTranslator = Translator<MessageKey>;

const I18nContext = createContext<UiTranslator>();

// Entrypoints provide the translator; components read it with useI18n().
export function I18nProvider(props: { translator: UiTranslator; children: JSX.Element }) {
  return <I18nContext.Provider value={props.translator}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): UiTranslator {
  const translator = useContext(I18nContext);
  if (!translator) throw new Error("I18nProvider is missing.");
  return translator;
}

// Applies the language and title before the first render. Titles receive the product name as $1.
export function prepareDocument(translator: UiTranslator, title: MessageKey) {
  document.documentElement.lang = translator.language;
  document.title = translator.t(title, translator.t("appName"));
}
