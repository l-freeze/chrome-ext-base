import "../styles/welcome.css";
import { render } from "solid-js/web";
import { createEnvironment } from "../../composition/environment";
import { createWelcomeScreen } from "../../composition/welcome";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { ExtensionShell } from "../layouts/extension-shell";
import { Welcome } from "../screens/welcome/welcome";

const application = createWelcomeScreen(createEnvironment());
void loadTranslator().then((translator) => {
  prepareDocument(translator, "documentTitleWelcome");
  const dispose = render(() => (
    <I18nProvider translator={translator}>
      <ExtensionShell><Welcome app={application} optionsHref={application.optionsHref} /></ExtensionShell>
    </I18nProvider>
  ), document.querySelector<HTMLElement>("#app")!);
  window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
});
