import { createSettingsContext } from "./settings";
// @sample-begin
import { createNoteScreens } from "./notes";
import { createPopupPage } from "./page";
// @sample-end

export function createPopupApplication() {
  const context = createSettingsContext();
  return {
    settings: context.actions,
    settingsChanges: context.changes,
    preview: !context.extension,
    // @sample-begin
    ...createNoteScreens(context),
    ...createPopupPage(context),
    // @sample-end
  };
}
