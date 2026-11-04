// Sample section: the note editor, the REST import, and following notes saved elsewhere.
import { createSignal, onCleanup } from "solid-js";
import type { NoteActions, NoteChanges } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import { connectLive } from "../../live";
import { useI18n } from "../../i18n";
import { message, Status } from "./status";

export function NoteSection(props: { notes: NoteActions; noteChanges: NoteChanges }) {
  const { t, language } = useI18n();
  const formatter = new Intl.NumberFormat(language);
  let form!: HTMLFormElement;
  let disposed = false;
  let noteReady = false;
  const [text, setText] = createSignal("");
  const [savedText, setSavedText] = createSignal("");
  const [busy, setBusy] = createSignal(true);
  const [status, setStatus] = createSignal(message("sidepanelNoteLoading"));
  const count = () => t("noteCount", formatter.format(text().length), formatter.format(MAX_NOTE_LENGTH));
  onCleanup(() => { disposed = true; });

  // Notes saved elsewhere (another screen, the context menu) replace the view, never an unsaved draft.
  onCleanup(connectLive(() => props.notes.loadNote(undefined), (value, error) => props.noteChanges.subscribe(value, error), (value, changed) => {
    if (!noteReady) {
      noteReady = true;
      setText(value.text); setSavedText(value.text); setBusy(false); setStatus(message("sidepanelNoteReady"));
      return;
    }
    if (!changed || busy() || value.text === savedText()) return;
    if (text() !== savedText()) {
      setSavedText(value.text);
      setStatus(message("noteRemoteDraftKept"));
      return;
    }
    setText(value.text); setSavedText(value.text); setStatus(message("noteRemoteApplied"));
  }, () => {
    setStatus(message(noteReady ? "noteStoredReadFailed" : "sidepanelNoteLoadFailed", true));
  }));

  async function perform(operation: () => Promise<Note>) {
    if (busy()) return;
    setBusy(true); setStatus(message("statusSaving"));
    try {
      const value = await operation();
      if (disposed) return;
      setText(value.text); setSavedText(value.text); setStatus(message("sidepanelNoteSaved"));
    } catch { if (!disposed) setStatus(message("sidepanelNoteSaveFailed", true)); }
    finally { if (!disposed) setBusy(false); }
  }

  return (
    <>
      <section class="card panel-card" aria-labelledby="panel-note-title">
        <form ref={form} class="card-body" aria-busy={busy()} onSubmit={(event) => {
          event.preventDefault();
          void perform(() => props.notes.saveNote({ text: text() }));
        }}>
          <div class="panel-section-heading"><label id="panel-note-title" for="panel-note">{t("noteLabel")}</label><span id="panel-count" class="badge badge-soft badge-primary badge-sm" aria-live="off">{count()}</span></div>
          <textarea id="panel-note" class="textarea panel-editor" maxLength={MAX_NOTE_LENGTH}
            placeholder={t("sidepanelNotePlaceholder")}
            aria-describedby="panel-note-help panel-count" disabled={busy()} value={text()}
            onInput={(event) => {
              setText(event.currentTarget.value);
              setStatus(message(text() === savedText() ? "sidepanelNoteClean" : "unsavedChanges"));
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) { event.preventDefault(); if (!busy()) form.requestSubmit(); }
            }} />
          <div class="panel-note-actions"><p id="panel-note-help" class="panel-description">{t("sidepanelKeyboardHint")}</p><button type="submit" class="btn btn-primary" disabled={busy()}>{t("noteSave")}</button></div>
          <Status value={status()} />
        </form>
      </section>

      <details class="card panel-rest">
        <summary>{t("sidepanelRestSummary")}</summary>
        <div class="card-body">
          <p class="panel-description">{t("sidepanelRestHelp")}</p>
          <button type="button" class="btn btn-soft" disabled={busy()} onClick={() => void perform(() => props.notes.importNote({ id: 1 }))}>{t("importButton")}</button>
        </div>
      </details>
    </>
  );
}
