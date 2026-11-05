import "../styles/app.css";
import { render } from "solid-js/web";
import { createPopupApplication } from "../../composition/popup";
import { loadTranslator } from "../../composition/i18n";
import { I18nProvider, prepareDocument } from "../i18n";
import { ExtensionShell } from "../layouts/extension-shell";
import { Popup } from "../screens/popup/popup";
// @sample-begin
import { NoteSection } from "../screens/popup/note";
import { PageSection } from "../screens/popup/page";
import { ArrivalsSection } from "../screens/popup/arrivals";
// @sample-end

const application = createPopupApplication();
void loadTranslator().then((translator) => {
  prepareDocument(translator, "documentTitlePopup");
  const dispose = render(() => (
    <I18nProvider translator={translator}>
      <ExtensionShell>
        <Popup app={application}>
          {/* @sample-begin */}
          <NoteSection notes={application.notes} noteChanges={application.noteChanges} />
          <PageSection page={application.page} preview={application.preview} />
          <ArrivalsSection arrivals={application.arrivals} />
          {/* @sample-end */}
        </Popup>
      </ExtensionShell>
    </I18nProvider>
  ), document.querySelector<HTMLElement>("#app")!);
  window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
});
