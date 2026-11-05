import "../styles/sidepanel-options.css";
import { render } from "solid-js/web";
import { createEnvironment } from "../../composition/environment";
import { createSettings } from "../../composition/settings";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { ExtensionShell } from "../layouts/extension-shell";
import { Options } from "../screens/options/options";
import type { OptionsVariant } from "../screens/options/options";

const settings = createSettings(createEnvironment());
const variant: OptionsVariant = { previewHref: "./sidepanel.html", themeHelp: "optionsThemeHelpSidepanel", previewNote: "optionsLiveNoteSidepanel" };
void loadTranslator().then((translator) => {
  prepareDocument(translator, "documentTitleOptions");
  const dispose = render(() => (
    <I18nProvider translator={translator}>
      <ExtensionShell><Options actions={settings.actions} changes={settings.changes} variant={variant} /></ExtensionShell>
    </I18nProvider>
  ), document.querySelector<HTMLElement>("#app")!);
  window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
});
