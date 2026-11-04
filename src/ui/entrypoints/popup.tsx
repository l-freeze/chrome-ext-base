import "../styles/app.css";
import { render } from "solid-js/web";
import { createPopupApplication } from "../../composition/popup";
import { ExtensionShell } from "../layouts/extension-shell";
import { Popup } from "../screens/popup/popup";

const application = createPopupApplication();
const dispose = render(() => <ExtensionShell><Popup app={application} /></ExtensionShell>, document.querySelector<HTMLElement>("#app")!);
window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
