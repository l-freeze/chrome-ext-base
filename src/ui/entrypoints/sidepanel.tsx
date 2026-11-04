import "../styles/sidepanel.css";
import { render } from "solid-js/web";
import { createSidepanelApplication } from "../../composition/sidepanel";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { Sidepanel } from "../screens/sidepanel/sidepanel";

const root = document.querySelector<HTMLElement>("#app")!;
let active = true;
let dispose: (() => void) | undefined;
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) { active = false; dispose?.(); }
});
void loadTranslator().then(async (translator) => {
  prepareDocument(translator, "documentTitleSidepanel");
  try {
    const application = await createSidepanelApplication();
    if (active) dispose = render(() => <I18nProvider translator={translator}><Sidepanel app={application} /></I18nProvider>, root);
  } catch {
    if (active) root.textContent = translator.t("sidepanelStartFailed");
  }
});
