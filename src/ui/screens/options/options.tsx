import { createSignal, onCleanup } from "solid-js";
import type { Settings } from "../../../features/settings/settings";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import { applyTheme, connectSettings } from "../../settings";
import { ValidationError } from "../../../lib/validation";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

// Copy that differs between the popup and sidepanel builds of the shared settings screen.
export interface OptionsVariant {
  previewHref: string;
  themeHelp: MessageKey;
  previewNote: MessageKey;
}

export function Options(props: { actions: SettingsActions; changes: SettingsChanges; variant: OptionsVariant }) {
  const { t } = useI18n();
  let dialog!: HTMLDialogElement;
  let fileInput!: HTMLInputElement;
  let disposed = false;
  const [theme, setTheme] = createSignal<string>("system");
  const [ready, setReady] = createSignal(false);
  const [busy, setBusy] = createSignal(true);
  const [dirty, setDirty] = createSignal(false);
  const [status, setStatus] = createSignal<MessageKey>("settingsLoading");

  function render(value: Settings) {
    setTheme(value.theme);
    setDirty(false);
    setReady(true);
    applyTheme(value);
  }

  onCleanup(connectSettings(props.actions, props.changes, (value, changed) => {
    applyTheme(value);
    if (changed && (dirty() || busy()) && ready()) {
      if (dirty()) setStatus("optionsRemoteDraftKept");
      return;
    }
    render(value);
    setBusy(false);
    setStatus(changed ? "optionsRemoteApplied" : "optionsLoaded");
  }, () => {
    setBusy(false);
    setStatus("optionsUnreadable");
  }));
  onCleanup(() => { disposed = true; });

  async function perform(operation: () => Promise<Settings>, message: MessageKey, failure: (error: unknown) => MessageKey = () => "optionsSaveFailed") {
    if (busy()) return;
    setBusy(true);
    setStatus("statusSaving");
    try {
      const value = await operation();
      if (disposed) return;
      render(value);
      setStatus(message);
    } catch (error) {
      if (!disposed) setStatus(failure(error));
    } finally {
      if (!disposed) setBusy(false);
    }
  }

  // Reading and saving the file is the screen's job; the feature defines and validates the backup format.
  async function exportBackup() {
    if (busy()) return;
    try {
      const backup = await props.actions.exportBackup(undefined);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2) + "\n"], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "settings-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      if (!disposed) setStatus("optionsExported");
    } catch {
      if (!disposed) setStatus("optionsSaveFailed");
    }
  }
  async function importBackup(file: File) {
    let content: unknown;
    try { content = JSON.parse(await file.text()); }
    catch { if (!disposed) setStatus("optionsImportInvalid"); return; }
    await perform(() => props.actions.importBackup(content), "optionsImported",
      (error) => error instanceof ValidationError ? "optionsImportInvalid" : "optionsSaveFailed");
  }

  return (
    <>
      <div class="options-heading"><p class="eyebrow">{t("optionsEyebrow")}</p><h2>{t("optionsHeading")}</h2><p>{t("optionsIntro")}</p></div>
      <div class="options-grid">
        <section class="card bg-base-100 settings-card" aria-labelledby="settings-title">
          <form class="card-body" aria-busy={busy()}
            onInput={() => { setDirty(true); setStatus("unsavedChanges"); }}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready() || busy()) return;
              const input = { theme: theme() };
              void perform(() => props.actions.save(input), "optionsSaved");
            }}>
            <h3 id="settings-title">{t("optionsGeneral")}</h3>
            <fieldset disabled={busy() || !ready()}>
              <label class="setting-label" for="theme">{t("optionsThemeLabel")}</label>
              <p class="setting-description" id="theme-help">{t(props.variant.themeHelp)}</p>
              <select id="theme" name="theme" class="select select-bordered w-full" aria-describedby="theme-help"
                value={theme()} onChange={(event) => setTheme(event.currentTarget.value)}>
                <option value="system">{t("themeSystem")}</option><option value="light">{t("themeLight")}</option><option value="dark">{t("themeDark")}</option>
              </select>
              <button class="btn btn-primary w-full" type="submit">{t("optionsSave")}</button>
            </fieldset>
            <p id="options-status" role="status" aria-live="polite">{t(status())}</p>
          </form>
          <div class="reset-section">
            <div><h3>{t("optionsResetHeading")}</h3><p>{t("optionsResetHelp")}</p></div>
            <button class="btn btn-outline btn-sm" type="button" disabled={busy()} onClick={() => { if (!busy()) dialog.showModal(); }}>{t("optionsResetButton")}</button>
          </div>
          <div class="reset-section backup-section">
            <div><h3>{t("optionsBackupHeading")}</h3><p>{t("optionsBackupHelp")}</p></div>
            <div class="backup-actions">
              <button id="export-settings" class="btn btn-outline btn-sm" type="button" disabled={busy()} onClick={() => void exportBackup()}>{t("optionsExport")}</button>
              <button class="btn btn-outline btn-sm" type="button" disabled={busy()} onClick={() => fileInput.click()}>{t("optionsImport")}</button>
              <input ref={fileInput} id="import-settings" type="file" accept="application/json,.json" hidden
                onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importBackup(file); }} />
            </div>
          </div>
        </section>
        <aside class="card live-guide" aria-labelledby="live-title">
          <div class="card-body">
            <span class="badge badge-soft badge-primary badge-sm">{t("optionsLiveBadge")}</span>
            <h3 id="live-title">{t("optionsLiveHeading")}</h3>
            <p>{t("optionsLiveBody")}</p>
            <ol><li>{t("optionsLiveStep1")}</li><li>{t("optionsLiveStep2")}</li><li>{t("optionsLiveStep3")}</li></ol>
            <a href={props.variant.previewHref} target="_blank" rel="noopener" class="btn btn-soft btn-primary">{t("optionsLiveLink")}</a>
            <p class="live-guide-note">{t(props.variant.previewNote)}</p>
          </div>
        </aside>
      </div>
      <dialog ref={dialog} class="modal" aria-labelledby="reset-title" aria-describedby="reset-help">
        <div class="modal-box">
          <h2 id="reset-title" class="text-lg font-bold">{t("optionsDialogTitle")}</h2>
          <p id="reset-help" class="py-4 text-sm">{t("optionsDialogBody")}</p>
          <form method="dialog" class="modal-action">
            <button class="btn" value="cancel" autofocus>{t("optionsDialogCancel")}</button>
            <button type="button" class="btn btn-primary" onClick={() => {
              if (!dialog.open || busy()) return;
              dialog.close();
              void perform(() => props.actions.reset({ confirmed: true }), "optionsResetDone");
            }}>{t("optionsResetHeading")}</button>
          </form>
        </div>
      </dialog>
    </>
  );
}
