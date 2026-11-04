import { createSettingsContext } from "./settings";
// @sample-begin
import { createNoteScreens } from "./notes";
import { createSidepanelPage } from "./page";
// @sample-end

export async function createSidepanelApplication() {
  const context = createSettingsContext();
  return {
    settings: context.actions,
    settingsChanges: context.changes,
    preview: !context.extension,
    // @sample-begin
    ...createNoteScreens(context),
    ...(await createSidepanelPage(context)),
    // @sample-end
  };
}
