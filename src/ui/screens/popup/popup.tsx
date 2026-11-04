import { createSignal, onCleanup, Show } from "solid-js";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { Theme } from "../../../features/settings/settings";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import { PageCaptureError } from "../../../features/page/page";
import type { NoteActions, NoteChanges } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import { applyTheme, connectSettings } from "../../settings";
import { connectLive } from "../../live";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";
import { ActionButton } from "../../components/action-button";
import { Feedback } from "../../components/feedback";
import type { FeedbackState } from "../../components/feedback";

export interface PopupApplication {
  notes: NoteActions;
  noteChanges: NoteChanges;
  settings: SettingsActions;
  settingsChanges: SettingsChanges;
  page: PageActions;
  preview: boolean;
}

const themeNames: Record<Theme, MessageKey> = { system: "themeSystem", light: "themeLight", dark: "themeDark" };
const failures: Record<PageCaptureError["reason"], MessageKey> = { "unsupported-page": "captureUnsupportedPage", blocked: "captureBlocked" };
const withoutSelection = (info: PageInfo): PageInfo => ({ ...info, selection: "", selectionTruncated: false });

export function Popup(props: { app: PopupApplication }) {
  const app = props.app;
  const { t, language } = useI18n();
  const formatter = new Intl.NumberFormat(language);
  let form!: HTMLFormElement;
  let disposed = false;
  const [text, setText] = createSignal("");
  const [savedText, setSavedText] = createSignal("");
  const [busy, setBusy] = createSignal<"init" | "save" | "import" | undefined>("init");
  const [feedback, setFeedback] = createSignal<{ message: MessageKey; state: FeedbackState }>({ message: "popupLoading", state: "loading" });
  const [settingsReady, setSettingsReady] = createSignal(false);
  const [includeSelection, setIncludeSelection] = createSignal(false);
  const [theme, setTheme] = createSignal<Theme>();
  const [settingsStatus, setSettingsStatus] = createSignal<MessageKey>("settingsLoading");
  const [capturing, setCapturing] = createSignal(false);
  const [captured, setCaptured] = createSignal<PageInfo>();
  const [pageStatus, setPageStatus] = createSignal<MessageKey>(app.preview ? "previewSampleIntro" : "popupPageIntro");
  const show = (message: MessageKey, state: FeedbackState = "idle") => setFeedback({ message, state });
  const count = () => t("noteCount", formatter.format(text().length), formatter.format(MAX_NOTE_LENGTH));
  const accept = (note: Note) => { setText(note.text); setSavedText(note.text); };

  // Notes saved elsewhere (another screen, the context menu) replace the view, never an unsaved draft.
  onCleanup(connectLive(() => app.notes.loadNote(undefined), (value, error) => app.noteChanges.subscribe(value, error), (note, changed) => {
    if (busy() === "init") {
      accept(note);
      setBusy(undefined);
      show("popupReady");
      return;
    }
    if (!changed || busy() || note.text === savedText()) return;
    if (text() !== savedText()) {
      setSavedText(note.text);
      show("noteRemoteDraftKept", "dirty");
      return;
    }
    accept(note);
    show("noteRemoteApplied", "success");
  }, () => {
    show(busy() === "init" ? "popupLoadFailed" : "noteStoredReadFailed", "error");
  }));

  async function perform(action: "save" | "import", operation: () => Promise<Note>, pending: MessageKey, success: MessageKey, failure: MessageKey) {
    if (busy()) return;
    setBusy(action);
    show(pending, "loading");
    try {
      const note = await operation();
      if (disposed) return;
      accept(note);
      show(success, "success");
    } catch {
      if (!disposed) show(failure, "error");
    } finally {
      if (!disposed) setBusy(undefined);
    }
  }

  onCleanup(connectSettings(app.settings, app.settingsChanges, (value, changed) => {
    applyTheme(value);
    setSettingsReady(true);
    setIncludeSelection(value.includeSelection);
    const current = captured();
    if (!value.includeSelection && current) setCaptured(withoutSelection(current));
    setTheme(value.theme);
    setSettingsStatus(changed ? "popupSettingsChanged" : "settingsAutoApply");
  }, () => {
    setSettingsReady(false);
    setSettingsStatus("popupSettingsUnreadable");
  }));
  onCleanup(() => { disposed = true; });

  function capture() {
    if (!settingsReady() || capturing()) return;
    setCapturing(true);
    setPageStatus("captureCapturing");
    void app.page.capture(undefined).then((info) => {
      if (disposed) return;
      setCaptured(includeSelection() ? info : withoutSelection(info));
      setPageStatus(app.preview ? "popupCapturedPreview" : "popupCaptured");
    }, (error: unknown) => {
      if (disposed) return;
      setCaptured(undefined);
      setPageStatus(error instanceof PageCaptureError ? failures[error.reason] : "popupCaptureFailed");
    }).finally(() => { if (!disposed) setCapturing(false); });
  }

  return (
    <>
      <div class="popup-toolbar">
        <p class="intro-copy">{t("popupIntro")}</p>
        <a href="./options.html" target="_blank" rel="noopener" class="btn btn-ghost btn-xs">{t("openSettings")}</a>
      </div>

      <section class="card bg-base-100 note-card" aria-labelledby="note-title">
        <form ref={form} class="card-body" onSubmit={(event) => {
          event.preventDefault();
          void perform("save", () => app.notes.saveNote({ text: text() }), "noteSaving", "popupSaved", "popupSaveFailed");
        }}>
          <div class="note-heading">
            <label id="note-title" class="note-label" for="note">
              <svg class="size-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m14 5 5 5M4 20l4.5-1 12-12a2.1 2.1 0 0 0-3-3l-12 12L4 20Z" />
              </svg>
              {t("noteLabel")}
            </label>
            <span class="badge badge-sm badge-soft badge-primary note-counter" id="note-count" aria-live="off">{count()}</span>
          </div>
          <textarea id="note" name="note" class="textarea textarea-ghost note-editor" rows={5} maxLength={MAX_NOTE_LENGTH}
            placeholder={t("popupNotePlaceholder")}
            aria-describedby="note-help note-count" disabled={busy() !== undefined} value={text()}
            onInput={(event) => {
              setText(event.currentTarget.value);
              const dirty = text() !== savedText();
              show(dirty ? "popupDirty" : "popupClean", dirty ? "dirty" : "idle");
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
                event.preventDefault();
                if (!busy()) form.requestSubmit();
              }
            }} />
          <div class="note-actions">
            <p id="note-help" class="keyboard-hint"><kbd class="kbd kbd-xs">Ctrl / ⌘</kbd><kbd class="kbd kbd-xs">↵</kbd><span>{t("popupKeyboardHint")}</span></p>
            <ActionButton type="submit" class="btn btn-primary btn-sm save-button" disabled={busy() !== undefined} loading={busy() === "save"}
              icon={<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}>
              {t("noteSave")}
            </ActionButton>
          </div>
        </form>
      </section>

      <Feedback message={t(feedback().message)} state={feedback().state} />

      <section class="card bg-base-100 page-card" aria-labelledby="capture-title">
        <div class="card-body">
          <div class="page-heading">
            <h2 id="capture-title">{t("pageHeading")}</h2>
            <Show when={app.preview}><span class="badge badge-soft badge-sm">{t("previewBadge")}</span></Show>
          </div>
          <button id="capture-page" class="btn btn-outline btn-primary btn-sm" type="button" aria-describedby="page-status"
            disabled={!settingsReady() || capturing()} aria-busy={capturing()} onClick={capture}>{t("captureButton")}</button>
          <p id="page-status" class="page-help" role="status" aria-live="polite">{t(pageStatus())}</p>
          <Show when={captured()}>{(info) => (
            <div class="page-result">
              <h3>{info().title || t("captureUntitled")}</h3>
              <p class="page-url">{info().url}</p>
              <blockquote>{includeSelection() ? info().selection || t("captureNoSelection") : t("captureSelectionOff")}</blockquote>
              <Show when={includeSelection() && info().selectionTruncated}>
                <p class="page-help">{t("popupSelectionTruncated", formatter.format(info().selection.length))}</p>
              </Show>
            </div>
          )}</Show>
        </div>
      </section>

      <details class="card sample-card coffee-details">
        <summary>{t("popupRestSummary")}</summary>
        <div class="card-body">
          <ActionButton type="button" class="btn btn-soft btn-sm sample-button" describedBy="sample-help"
            disabled={busy() !== undefined} loading={busy() === "import"} iconPosition="end"
            onClick={() => void perform("import", () => app.notes.importNote({ id: 1 }), "popupImporting", "popupImported", "popupImportFailed")}
            icon={<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>}>
            {t("importButton")}
          </ActionButton>
          <p id="sample-help" class="sample-help">{t("popupRestHelp")}</p>
        </div>
      </details>

      <aside class="live-settings" aria-label={t("popupLiveSettingsLabel")}>
        <p>
          <span class="live-dot" aria-hidden="true" /> <span>{theme() ? t(themeNames[theme()!]) : t("popupLiveLoading")}</span>
          <span class="settings-divider">/</span>{t("popupLiveSelection")} <strong>{theme() ? t(includeSelection() ? "settingOn" : "settingOff") : "—"}</strong>
        </p>
        <p role="status" aria-live="polite">{t(settingsStatus())}</p>
      </aside>
    </>
  );
}
