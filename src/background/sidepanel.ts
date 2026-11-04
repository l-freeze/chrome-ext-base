// Service worker for the sidepanel build: shared handlers plus opening the panel from the toolbar.
import { startWorker } from "./worker";

startWorker();

function configurePanel() {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
    console.error("Failed to configure the side panel behavior.", error);
  });
}
chrome.runtime.onInstalled.addListener(configurePanel);
chrome.runtime.onStartup.addListener(configurePanel);
configurePanel();
