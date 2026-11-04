import "../styles/app.css";
import { render } from "solid-js/web";
import { createPopupApplication } from "../../composition/popup";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { ExtensionShell } from "../layouts/extension-shell";
import { Popup } from "../screens/popup/popup";

const application = createPopupApplication();
void loadTranslator().then((translator) => {
  prepareDocument(translator, "documentTitlePopup");
  const dispose = render(() => (
    <I18nProvider translator={translator}><ExtensionShell><Popup app={application} /></ExtensionShell></I18nProvider>
  ), document.querySelector<HTMLElement>("#app")!);
  window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
});
