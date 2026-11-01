import "../styles/sidepanel-options.css";
import { createSettingsContext } from "../../composition/settings";
import { mountExtensionShell } from "../layouts/extension-shell";
import { mountOptions } from "../screens/options/options";

const root = document.querySelector<HTMLElement>("#app")!;
const context = createSettingsContext();
const dispose = mountOptions(mountExtensionShell(root), context.actions, context.changes);
root.querySelector<HTMLAnchorElement>('a[href="./index.html"]')!.href = "./sidepanel.html";
root.querySelector<HTMLElement>("#theme-help")!.textContent = "保存すると、この画面と開いているサイドパネルに反映します。";
root.querySelector<HTMLElement>(".live-guide-note")!.textContent = "同じサイドパネル UI を確認用にタブで開きます。通常はツールバーのアイコンから開きます。";
window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
