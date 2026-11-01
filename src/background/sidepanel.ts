// Only the sidepanel build includes this worker. No DOM or feature state lives here.
function configurePanel() {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
    console.error("サイドパネルの起動設定に失敗しました。", error);
  });
}
chrome.runtime.onInstalled.addListener(configurePanel);
chrome.runtime.onStartup.addListener(configurePanel);
configurePanel();
