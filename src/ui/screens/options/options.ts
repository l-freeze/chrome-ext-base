import type { Settings } from "../../../features/settings/settings";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import { applyTheme, connectSettings } from "../../settings";
import template from "./options.html?raw";

export function mountOptions(root: HTMLElement, actions: SettingsActions, changes: SettingsChanges): () => void {
  root.innerHTML = template;
  const form = root.querySelector<HTMLFormElement>("#settings-form")!;
  const fields = root.querySelector<HTMLFieldSetElement>("#settings-fields")!;
  const theme = root.querySelector<HTMLSelectElement>("#theme")!;
  const selection = root.querySelector<HTMLInputElement>("#include-selection")!;
  const reset = root.querySelector<HTMLButtonElement>("#reset-settings")!;
  const status = root.querySelector<HTMLElement>("#options-status")!;
  const dialog = root.querySelector<HTMLDialogElement>("#reset-dialog")!;
  const confirm = root.querySelector<HTMLButtonElement>("#confirm-reset")!;
  let ready = false;
  let busy = true;
  let dirty = false;
  let disposed = false;

  function render(value: Settings) {
    theme.value = value.theme;
    selection.checked = value.includeSelection;
    dirty = false;
    ready = true;
    applyTheme(value);
  }
  function setBusy(value: boolean) {
    busy = value;
    fields.disabled = value || !ready;
    reset.disabled = value;
    form.setAttribute("aria-busy", String(value));
  }
  const disconnect = connectSettings(actions, changes, (value, changed) => {
    applyTheme(value);
    if (changed && (dirty || busy) && ready) {
      if (dirty) status.textContent = "別の画面で設定が更新されました。編集中の入力は保持しています。保存すると現在の入力で上書きします。";
      return;
    }
    render(value);
    setBusy(false);
    status.textContent = changed ? "別の画面の設定変更を反映しました。" : "設定を読み込みました。";
  }, () => {
    setBusy(false);
    status.textContent = "設定を読み出せません。リセットして初期設定に戻せます。";
  });

  async function perform(operation: () => Promise<Settings>, message: string) {
    if (busy) return;
    setBusy(true);
    status.textContent = "保存中…";
    try {
      const value = await operation();
      if (disposed) return;
      render(value);
      status.textContent = message;
    } catch {
      if (!disposed) status.textContent = "設定を保存できませんでした。入力を残しています。再度お試しください。";
    } finally {
      if (!disposed) setBusy(false);
    }
  }
  form.addEventListener("input", () => { dirty = true; status.textContent = "未保存の変更があります。"; });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!ready || busy) return;
    const input = { theme: theme.value, includeSelection: selection.checked };
    void perform(() => actions.save(input), "設定を保存しました。開いている画面にも反映されます。");
  });
  reset.addEventListener("click", () => { if (!busy) dialog.showModal(); });
  confirm.addEventListener("click", () => {
    if (!dialog.open || busy) return;
    dialog.close();
    void perform(() => actions.reset({ confirmed: true }), "初期設定に戻しました。メモはそのまま残っています。");
  });
  return () => { disposed = true; disconnect(); };
}
