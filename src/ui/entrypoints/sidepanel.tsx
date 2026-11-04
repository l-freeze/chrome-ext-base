import "../styles/sidepanel.css";
import { render } from "solid-js/web";
import { createSidepanelApplication } from "../../composition/sidepanel";
import { Sidepanel } from "../screens/sidepanel/sidepanel";

const root = document.querySelector<HTMLElement>("#app")!;
let active = true;
let dispose: (() => void) | undefined;
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) { active = false; dispose?.(); }
});
void createSidepanelApplication().then((application) => {
  if (active) dispose = render(() => <Sidepanel app={application} />, root);
}, () => { if (active) root.textContent = "サイドパネルを起動できませんでした。開き直してください。"; });
