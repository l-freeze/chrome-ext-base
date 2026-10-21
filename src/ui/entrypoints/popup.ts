import "../styles/app.css";
import { createPopupApplication } from "../../composition/popup";
import { mountExtensionShell } from "../layouts/extension-shell";
import { mountPopup } from "../screens/popup/popup";

const root = document.querySelector<HTMLElement>("#app")!;
const content = mountExtensionShell(root);
mountPopup(content, createPopupApplication());
