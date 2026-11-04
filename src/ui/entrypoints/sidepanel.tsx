import "../styles/sidepanel.css";
import { render } from "solid-js/web";
import { createSidepanelApplication } from "../../composition/sidepanel";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { Sidepanel } from "../screens/sidepanel/sidepanel";
// @sample-begin
import { NoteSection } from "../screens/sidepanel/note";
import { PageSection } from "../screens/sidepanel/page";
// @sample-end

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
    if (active) dispose = render(() => (
      <I18nProvider translator={translator}>
        <Sidepanel app={application}>
          {/* @sample-begin */}
          <PageSection page={application.page} access={application.access} accessChanges={application.accessChanges} preview={application.preview} />
          <NoteSection notes={application.notes} noteChanges={application.noteChanges} />
          {/* @sample-end */}
        </Sidepanel>
      </I18nProvider>
    ), root);
  } catch {
    if (active) root.textContent = translator.t("sidepanelStartFailed");
  }
});
