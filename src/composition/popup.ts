import { createEnvironment } from "./environment";
import { createSettings } from "./settings";
// @sample-begin
import { createNoteScreens } from "./notes";
import { createArrivalsScreens } from "./arrivals";
import { createPopupPage } from "./page";
// @sample-end

export function createPopupApplication() {
  const environment = createEnvironment();
  const settings = createSettings(environment);
  return {
    settings: settings.actions,
    settingsChanges: settings.changes,
    preview: !environment.extension,
    // @sample-begin
    ...createNoteScreens(environment),
    ...createArrivalsScreens(environment),
    ...createPopupPage(environment),
    // @sample-end
  };
}
