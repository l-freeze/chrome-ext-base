import "../styles/app.css";
import { render } from "solid-js/web";
import { createSettingsContext } from "../../composition/settings";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { ExtensionShell } from "../layouts/extension-shell";
import { Options } from "../screens/options/options";
import type { OptionsVariant } from "../screens/options/options";

const context = createSettingsContext();
const variant: OptionsVariant = { previewHref: "./index.html", themeHelp: "optionsThemeHelpPopup", previewNote: "optionsLiveNotePopup" };
void loadTranslator().then((translator) => {
  prepareDocument(translator, "documentTitleOptions");
  const dispose = render(() => (
    <I18nProvider translator={translator}>
      <ExtensionShell><Options actions={context.actions} changes={context.changes} variant={variant} /></ExtensionShell>
    </I18nProvider>
  ), document.querySelector<HTMLElement>("#app")!);
  window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
});
