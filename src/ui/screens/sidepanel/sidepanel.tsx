import { createSignal, onCleanup, Show } from "solid-js";
import type { NoteActions, NoteChanges } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import { PageCaptureError } from "../../../features/page/page";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { SiteAccessActions, SiteAccessChanges } from "../../../features/site-access/ports";
import type { SiteAccess, SiteUnavailable } from "../../../features/site-access/access";
import { applyTheme, connectSettings } from "../../settings";
import { connectLive } from "../../live";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

export interface SidepanelApplication {
  notes: NoteActions; noteChanges: NoteChanges; page: PageActions;
  settings: SettingsActions; settingsChanges: SettingsChanges;
  access: SiteAccessActions; accessChanges: SiteAccessChanges;
  preview: boolean;
}

interface Message { key: MessageKey; error: boolean }
const message = (key: MessageKey, error = false): Message => ({ key, error });
const withoutSelection = (info: PageInfo): PageInfo => ({ ...info, selection: "", selectionTruncated: false });
const unavailable: Record<SiteUnavailable, MessageKey> = {
  "no-tab": "sidepanelAccessNoTab", "invalid-url": "sidepanelAccessInvalidUrl", "unsupported-page": "sidepanelAccessUnsupported",
};
const failures: Record<PageCaptureError["reason"], MessageKey> = { "unsupported-page": "captureUnsupportedPage", blocked: "captureBlocked" };

function Status(props: { value: Message }) {
  const { t } = useI18n();
  return <p class="panel-description" role="status" aria-live="polite" data-error={String(props.value.error)}>{t(props.value.key)}</p>;
}

export function Sidepanel(props: { app: SidepanelApplication }) {
  const app = props.app;
  const { t, language } = useI18n();
  const formatter = new Intl.NumberFormat(language);
  let form!: HTMLFormElement;
  let disposed = false;
  // Increments on every page or permission change; older async results are discarded.
  let revision = 0;
  const [text, setText] = createSignal("");
  const [savedText, setSavedText] = createSignal("");
  const [noteBusy, setNoteBusy] = createSignal(true);
  const [noteStatus, setNoteStatus] = createSignal(message("sidepanelNoteLoading"));
  const [settingsReady, setSettingsReady] = createSignal(false);
  const [includeSelection, setIncludeSelection] = createSignal(false);
  const [settingsStatus, setSettingsStatus] = createSignal(message("settingsLoading"));
  const [site, setSite] = createSignal<SiteAccess>();
  const [siteLabel, setSiteLabel] = createSignal<string>(t("sidepanelSiteChecking"));
  const [accessStatus, setAccessStatus] = createSignal(message("sidepanelAccessChecking"));
  const [pageStatus, setPageStatus] = createSignal(message("sidepanelPageReady"));
  const [capturing, setCapturing] = createSignal(false);
  const [granting, setGranting] = createSignal(false);
  const [captured, setCaptured] = createSignal<PageInfo>();
  const available = () => { const value = site(); return value?.available ? value : undefined; };
  const count = () => t("noteCount", formatter.format(text().length), formatter.format(MAX_NOTE_LENGTH));

  async function refreshAccess() {
    const current = ++revision;
    setSite(undefined); setCaptured(undefined);
    setAccessStatus(message("sidepanelAccessChecking"));
    setPageStatus(message("sidepanelPageReady"));
    try {
      const value = await app.access.status(undefined);
      if (disposed || current !== revision) return;
      setSite(value);
      setSiteLabel(value.available ? value.origin : t("sidepanelSiteNone"));
      setAccessStatus(message(!value.available ? unavailable[value.reason] : app.preview ? "previewSampleIntro" : value.allowed ? "sidepanelAccessAllowed" : "sidepanelAccessNeeded"));
    } catch {
      if (!disposed && current === revision) setAccessStatus(message("sidepanelAccessCheckFailed", true));
    }
  }

  onCleanup(app.accessChanges.subscribe(() => { void refreshAccess(); }));
  onCleanup(connectSettings(app.settings, app.settingsChanges, (value, changed) => {
    setSettingsReady(true); setIncludeSelection(value.includeSelection); applyTheme(value);
    const current = captured();
    if (current && !value.includeSelection) setCaptured(withoutSelection(current));
    setSettingsStatus(message(changed ? "sidepanelSettingsChanged" : "settingsAutoApply"));
  }, () => {
    setSettingsReady(false); setIncludeSelection(false); setCaptured(undefined);
    setSettingsStatus(message("sidepanelSettingsUnreadable", true));
  }));
  onCleanup(() => { disposed = true; revision++; });

  function grant() {
    const value = available();
    if (!value || granting()) return;
    setGranting(true);
    // No await before grant: Chrome needs the user gesture for its permission prompt.
    void app.access.grant({ origin: value.origin }).then(async (granted) => {
      if (disposed) return;
      await refreshAccess();
      if (!disposed && !granted) setAccessStatus(message("sidepanelAccessDenied"));
    }, () => { if (!disposed) setAccessStatus(message("sidepanelAccessGrantFailed", true)); })
      .finally(() => { if (!disposed) setGranting(false); });
  }

  const captureDisabled = () => !settingsReady() || !available()?.allowed || capturing() || granting();
  function capture() {
    if (captureDisabled()) return;
    const current = revision;
    setCapturing(true);
    setPageStatus(message("captureCapturing"));
    void app.page.capture(undefined).then((info) => {
      if (disposed || current !== revision) return;
      setCaptured(includeSelection() ? info : withoutSelection(info));
      setPageStatus(message(app.preview ? "sidepanelCapturedPreview" : "sidepanelCaptured"));
    }, (error: unknown) => {
      if (disposed || current !== revision) return;
      setCaptured(undefined);
      setPageStatus(message(error instanceof PageCaptureError ? failures[error.reason] : "sidepanelCaptureFailed", true));
    }).finally(() => { if (!disposed) setCapturing(false); });
  }

  async function perform(operation: () => Promise<Note>) {
    if (noteBusy()) return;
    setNoteBusy(true); setNoteStatus(message("noteSaving"));
    try {
      const value = await operation();
      if (disposed) return;
      setText(value.text); setSavedText(value.text); setNoteStatus(message("sidepanelNoteSaved"));
    } catch { if (!disposed) setNoteStatus(message("sidepanelNoteSaveFailed", true)); }
    finally { if (!disposed) setNoteBusy(false); }
  }

  // Notes saved elsewhere (another screen, the context menu) replace the view, never an unsaved draft.
  let noteReady = false;
  onCleanup(connectLive(() => app.notes.loadNote(undefined), (value, error) => app.noteChanges.subscribe(value, error), (value, changed) => {
    if (!noteReady) {
      noteReady = true;
      setText(value.text); setSavedText(value.text); setNoteBusy(false); setNoteStatus(message("sidepanelNoteReady"));
      return;
    }
    if (!changed || noteBusy() || value.text === savedText()) return;
    if (text() !== savedText()) {
      setSavedText(value.text);
      setNoteStatus(message("noteRemoteDraftKept"));
      return;
    }
    setText(value.text); setSavedText(value.text); setNoteStatus(message("noteRemoteApplied"));
  }, () => {
    setNoteStatus(message(noteReady ? "noteStoredReadFailed" : "sidepanelNoteLoadFailed", true));
  }));
  void refreshAccess();

  return (
    <main class="panel-shell">
      <header class="panel-header">
        <div class="panel-brand"><span class="panel-mark" aria-hidden="true">Q</span><div><h1>Quick Note<span> .</span></h1><p>{t("sidepanelTagline")}</p></div></div>
        <a href="./sidepanel-options.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">{t("openSettings")}</a>
      </header>

      <section class="card panel-card" aria-labelledby="panel-page-title">
        <div class="card-body">
          <div class="panel-section-heading">
            <h2 id="panel-page-title">{t("pageHeading")}</h2>
            <Show when={app.preview}><span class="badge badge-soft badge-sm">{t("previewBadge")}</span></Show>
          </div>
          <p class="panel-description">{t("sidepanelPageIntro")}</p>
          <div class="panel-site"><span class="panel-site-dot" aria-hidden="true" /><span>{siteLabel()}</span></div>
          <Status value={accessStatus()} />
          <Show when={available() && !available()!.allowed}>
            <button type="button" class="btn btn-soft btn-primary" disabled={granting()} aria-busy={granting()} onClick={grant}>{t("sidepanelAllow")}</button>
          </Show>
          <button type="button" class="btn btn-primary" disabled={captureDisabled()} aria-busy={capturing()} onClick={capture}>{t("captureButton")}</button>
          <Status value={pageStatus()} />
          <Show when={captured()}>{(info) => (
            <div class="panel-result">
              <h3>{info().title || t("captureUntitled")}</h3>
              <p class="panel-result-url">{info().url}</p>
              <blockquote>{includeSelection() ? info().selection || t("captureNoSelection") : t("captureSelectionOff")}</blockquote>
              <Show when={includeSelection() && info().selectionTruncated}>
                <p class="panel-description">{t("sidepanelSelectionTruncated", formatter.format(info().selection.length))}</p>
              </Show>
            </div>
          )}</Show>
        </div>
      </section>

      <section class="card panel-card" aria-labelledby="panel-note-title">
        <form ref={form} class="card-body" aria-busy={noteBusy()} onSubmit={(event) => {
          event.preventDefault();
          void perform(() => app.notes.saveNote({ text: text() }));
        }}>
          <div class="panel-section-heading"><label id="panel-note-title" for="panel-note">{t("noteLabel")}</label><span id="panel-count" class="badge badge-soft badge-primary badge-sm" aria-live="off">{count()}</span></div>
          <textarea id="panel-note" class="textarea panel-editor" maxLength={MAX_NOTE_LENGTH}
            placeholder={t("sidepanelNotePlaceholder")}
            aria-describedby="panel-note-help panel-count" disabled={noteBusy()} value={text()}
            onInput={(event) => {
              setText(event.currentTarget.value);
              setNoteStatus(message(text() === savedText() ? "sidepanelNoteClean" : "unsavedChanges"));
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) { event.preventDefault(); if (!noteBusy()) form.requestSubmit(); }
            }} />
          <div class="panel-note-actions"><p id="panel-note-help" class="panel-description">{t("sidepanelKeyboardHint")}</p><button type="submit" class="btn btn-primary" disabled={noteBusy()}>{t("noteSave")}</button></div>
          <Status value={noteStatus()} />
        </form>
      </section>

      <details class="card panel-rest">
        <summary>{t("sidepanelRestSummary")}</summary>
        <div class="card-body">
          <p class="panel-description">{t("sidepanelRestHelp")}</p>
          <button type="button" class="btn btn-soft" disabled={noteBusy()} onClick={() => void perform(() => app.notes.importNote({ id: 1 }))}>{t("importButton")}</button>
        </div>
      </details>
      <footer class="panel-footer">
        <p role="status" aria-live="polite" data-error={String(settingsStatus().error)}>{t(settingsStatus().key)}</p>
        <p>{t("sidepanelStorageNote")}</p>
      </footer>
    </main>
  );
}
