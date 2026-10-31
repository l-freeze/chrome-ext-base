import "../styles/app.css";
import { createSettingsContext } from "../../composition/settings";
import { mountExtensionShell } from "../layouts/extension-shell";
import { mountOptions } from "../screens/options/options";

const context = createSettingsContext();
const content = mountExtensionShell(document.querySelector<HTMLElement>("#app")!);
const dispose = mountOptions(content, context.actions, context.changes);
window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
