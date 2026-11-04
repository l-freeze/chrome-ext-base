import "../styles/app.css";
import { render } from "solid-js/web";
import { createSettingsContext } from "../../composition/settings";
import { ExtensionShell } from "../layouts/extension-shell";
import { Options } from "../screens/options/options";

const context = createSettingsContext();
const variant = {
  previewHref: "./index.html",
  themeHelp: "保存すると、この画面と開いているポップアップ UI に反映します。",
  previewNote: "同じポップアップ UI を確認用にタブで開きます。通常はツールバーのアイコンから開く拡張です。",
};
const dispose = render(() => (
  <ExtensionShell><Options actions={context.actions} changes={context.changes} variant={variant} /></ExtensionShell>
), document.querySelector<HTMLElement>("#app")!);
window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
