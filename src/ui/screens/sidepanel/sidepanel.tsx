import { createSignal, onCleanup, Show } from "solid-js";
import type { NoteActions, NoteChanges } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { SiteAccessActions, SiteAccessChanges } from "../../../features/site-access/ports";
import type { SiteAccess } from "../../../features/site-access/access";
import { applyTheme, connectSettings } from "../../settings";
import { connectLive } from "../../live";

export interface SidepanelApplication {
  notes: NoteActions; noteChanges: NoteChanges; page: PageActions;
  settings: SettingsActions; settingsChanges: SettingsChanges;
  access: SiteAccessActions; accessChanges: SiteAccessChanges;
  preview: boolean;
}

interface Message { text: string; error: boolean }
const message = (text: string, error = false): Message => ({ text, error });
const withoutSelection = (info: PageInfo): PageInfo => ({ ...info, selection: "", selectionTruncated: false });

function Status(props: { value: Message }) {
  return <p class="panel-description" role="status" aria-live="polite" data-error={String(props.value.error)}>{props.value.text}</p>;
}

export function Sidepanel(props: { app: SidepanelApplication }) {
  const app = props.app;
  let form!: HTMLFormElement;
  let disposed = false;
  // Increments on every page or permission change; older async results are discarded.
  let revision = 0;
  const [text, setText] = createSignal("");
  const [savedText, setSavedText] = createSignal("");
  const [noteBusy, setNoteBusy] = createSignal(true);
  const [noteStatus, setNoteStatus] = createSignal(message("メモを読み込み中…"));
  const [settingsReady, setSettingsReady] = createSignal(false);
  const [includeSelection, setIncludeSelection] = createSignal(false);
  const [settingsStatus, setSettingsStatus] = createSignal(message("設定を読み込み中…"));
  const [site, setSite] = createSignal<SiteAccess>();
  const [siteLabel, setSiteLabel] = createSignal("ページを確認中…");
  const [accessStatus, setAccessStatus] = createSignal(message("アクセス状態を確認しています。"));
  const [pageStatus, setPageStatus] = createSignal(message("タイトル・URL・選択テキストを取得します。"));
  const [capturing, setCapturing] = createSignal(false);
  const [granting, setGranting] = createSignal(false);
  const [captured, setCaptured] = createSignal<PageInfo>();
  const available = () => { const value = site(); return value?.available ? value : undefined; };
  const count = () => `${text().length.toLocaleString("ja-JP")} / ${MAX_NOTE_LENGTH.toLocaleString("ja-JP")}`;

  async function refreshAccess() {
    const current = ++revision;
    setSite(undefined); setCaptured(undefined);
    setAccessStatus(message("アクセス状態を確認しています。"));
    setPageStatus(message("タイトル・URL・選択テキストを取得します。"));
    try {
      const value = await app.access.status(undefined);
      if (disposed || current !== revision) return;
      setSite(value);
      setSiteLabel(value.available ? value.origin : "取得できるページがありません");
      setAccessStatus(message(!value.available ? value.reason : app.preview ? "プレビューでは固定のサンプル情報を表示します。" : value.allowed ? "このサイトは取得できます。文章を選んでから取得してください。" : "初回は、このサイトへのアクセスを許可してください。"));
    } catch {
      if (!disposed && current === revision) setAccessStatus(message("ページを確認できません。パネルを開き直してください。", true));
    }
  }

  onCleanup(app.accessChanges.subscribe(() => { void refreshAccess(); }));
  onCleanup(connectSettings(app.settings, app.settingsChanges, (value, changed) => {
    setSettingsReady(true); setIncludeSelection(value.includeSelection); applyTheme(value);
    const current = captured();
    if (current && !value.includeSelection) setCaptured(withoutSelection(current));
    setSettingsStatus(message(changed ? "設定の変更を再読み込みなしで反映しました。" : "設定画面の変更を自動で反映します。"));
  }, () => {
    setSettingsReady(false); setIncludeSelection(false); setCaptured(undefined);
    setSettingsStatus(message("設定を読み出せません。設定画面でリセットしてください。", true));
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
      if (!disposed && !granted) setAccessStatus(message("許可されませんでした。取得する場合はもう一度許可してください。"));
    }, () => { if (!disposed) setAccessStatus(message("サイトを許可できませんでした。もう一度お試しください。", true)); })
      .finally(() => { if (!disposed) setGranting(false); });
  }

  const captureDisabled = () => !settingsReady() || !available()?.allowed || capturing() || granting();
  function capture() {
    if (captureDisabled()) return;
    const current = revision;
    setCapturing(true);
    setPageStatus(message("ページ情報を取得中…"));
    void app.page.capture(undefined).then((info) => {
      if (disposed || current !== revision) return;
      setCaptured(includeSelection() ? info : withoutSelection(info));
      setPageStatus(message(app.preview ? "プレビュー用の固定データです。" : "取得しました。表示のみで、保存・外部送信はしません。"));
    }, (error: unknown) => {
      if (disposed || current !== revision) return;
      setCaptured(undefined);
      setPageStatus(message(error instanceof Error ? error.message : "取得できませんでした。", true));
    }).finally(() => { if (!disposed) setCapturing(false); });
  }

  async function perform(operation: () => Promise<Note>) {
    if (noteBusy()) return;
    setNoteBusy(true); setNoteStatus(message("保存中…"));
    try {
      const value = await operation();
      if (disposed) return;
      setText(value.text); setSavedText(value.text); setNoteStatus(message("保存しました。"));
    } catch { if (!disposed) setNoteStatus(message("保存できませんでした。入力を残しています。", true)); }
    finally { if (!disposed) setNoteBusy(false); }
  }

  // Notes saved elsewhere (another screen, the context menu) replace the view, never an unsaved draft.
  let noteReady = false;
  onCleanup(connectLive(() => app.notes.loadNote(undefined), (value, error) => app.noteChanges.subscribe(value, error), (value, changed) => {
    if (!noteReady) {
      noteReady = true;
      setText(value.text); setSavedText(value.text); setNoteBusy(false); setNoteStatus(message("このブラウザに保存できます。"));
      return;
    }
    if (!changed || noteBusy() || value.text === savedText()) return;
    if (text() !== savedText()) {
      setSavedText(value.text);
      setNoteStatus(message("別の画面でメモが更新されました。編集中の内容を保持しています。保存すると上書きします。"));
      return;
    }
    setText(value.text); setSavedText(value.text); setNoteStatus(message("別の画面で更新されたメモを反映しました。"));
  }, () => {
    setNoteStatus(message(noteReady ? "保存されたメモを読み出せませんでした。" : "メモを読み込めませんでした。開き直してください。", true));
  }));
  void refreshAccess();

  return (
    <main class="panel-shell">
      <header class="panel-header">
        <div class="panel-brand"><span class="panel-mark" aria-hidden="true">Q</span><div><h1>Quick Note<span> .</span></h1><p>ページのとなりに、小さなメモ帳。</p></div></div>
        <a href="./sidepanel-options.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">設定 ↗</a>
      </header>

      <section class="card panel-card" aria-labelledby="panel-page-title">
        <div class="card-body">
          <div class="panel-section-heading">
            <h2 id="panel-page-title">今見ているページ</h2>
            <Show when={app.preview}><span class="badge badge-soft badge-sm">プレビュー</span></Show>
          </div>
          <p class="panel-description">パネルを開いたまま文章を選び、取得できます。</p>
          <div class="panel-site"><span class="panel-site-dot" aria-hidden="true" /><span>{siteLabel()}</span></div>
          <Status value={accessStatus()} />
          <Show when={available() && !available()!.allowed}>
            <button type="button" class="btn btn-soft btn-primary" disabled={granting()} aria-busy={granting()} onClick={grant}>このサイトを許可</button>
          </Show>
          <button type="button" class="btn btn-primary" disabled={captureDisabled()} aria-busy={capturing()} onClick={capture}>ページ情報を取得</button>
          <Status value={pageStatus()} />
          <Show when={captured()}>{(info) => (
            <div class="panel-result">
              <h3>{info().title || "タイトルなし"}</h3>
              <p class="panel-result-url">{info().url}</p>
              <blockquote>{includeSelection() ? info().selection || "選択された文章はありません。" : "選択テキストの取得は OFF です。"}</blockquote>
              <Show when={includeSelection() && info().selectionTruncated}>
                <p class="panel-description">選択テキストは先頭 2,000 文字までです。</p>
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
          <div class="panel-section-heading"><label id="panel-note-title" for="panel-note">今日のメモ</label><span id="panel-count" class="badge badge-soft badge-primary badge-sm" aria-live="off">{count()}</span></div>
          <textarea id="panel-note" class="textarea panel-editor" maxLength={MAX_NOTE_LENGTH}
            placeholder={"調べたこと、気づいたこと。\nページを見ながら書き留めましょう。"}
            aria-describedby="panel-note-help panel-count" disabled={noteBusy()} value={text()}
            onInput={(event) => {
              setText(event.currentTarget.value);
              setNoteStatus(message(text() === savedText() ? "保存済みの内容です。" : "未保存の変更があります。"));
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) { event.preventDefault(); if (!noteBusy()) form.requestSubmit(); }
            }} />
          <div class="panel-note-actions"><p id="panel-note-help" class="panel-description">Ctrl / ⌘ + Enter で保存</p><button type="submit" class="btn btn-primary" disabled={noteBusy()}>保存する</button></div>
          <Status value={noteStatus()} />
        </form>
      </section>

      <details class="card panel-rest">
        <summary>REST サンプルを試す</summary>
        <div class="card-body">
          <p class="panel-description">SampleAPIs のコーヒー情報を取得して、現在のメモを置き換えます。</p>
          <button type="button" class="btn btn-soft" disabled={noteBusy()} onClick={() => void perform(() => app.notes.importNote({ id: 1 }))}>サンプルを取得して保存</button>
        </div>
      </details>
      <footer class="panel-footer">
        <p role="status" aria-live="polite" data-error={String(settingsStatus().error)}>{settingsStatus().text}</p>
        <p>メモと設定は、このブラウザに保存されます。</p>
      </footer>
    </main>
  );
}
