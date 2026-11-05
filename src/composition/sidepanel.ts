import { createEnvironment } from "./environment";
import { createSettings } from "./settings";
// @sample-begin
import { createNoteScreens } from "./notes";
import { createSidepanelPage } from "./page";
// @sample-end

export async function createSidepanelApplication() {
  const environment = createEnvironment();
  const settings = createSettings(environment);
  return {
    settings: settings.actions,
    settingsChanges: settings.changes,
    preview: !environment.extension,
    // @sample-begin
    ...createNoteScreens(environment),
    ...(await createSidepanelPage(environment)),
    // @sample-end
  };
}
