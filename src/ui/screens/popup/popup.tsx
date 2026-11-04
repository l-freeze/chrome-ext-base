import { createSignal, onCleanup, Show } from "solid-js";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { Theme } from "../../../features/settings/settings";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import type { NoteActions } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import { applyTheme, connectSettings } from "../../settings";
import { ActionButton } from "../../components/action-button";
import { Feedback } from "../../components/feedback";
import type { FeedbackState } from "../../components/feedback";

export interface PopupApplication {
  notes: NoteActions;
  settings: SettingsActions;
  settingsChanges: SettingsChanges;
  page: PageActions;
  preview: boolean;
}

const themeNames: Record<Theme, string> = { system: "端末に合わせる", light: "ライト", dark: "ダーク" };
const formatter = new Intl.NumberFormat("ja-JP");
const withoutSelection = (info: PageInfo): PageInfo => ({ ...info, selection: "", selectionTruncated: false });

export function Popup(props: { app: PopupApplication }) {
  const app = props.app;
  let form!: HTMLFormElement;
  let disposed = false;
  const [text, setText] = createSignal("");
  const [savedText, setSavedText] = createSignal("");
  const [busy, setBusy] = createSignal<"init" | "save" | "import" | undefined>("init");
  const [feedback, setFeedback] = createSignal<{ message: string; state: FeedbackState }>({ message: "読み込み中…", state: "loading" });
  const [settingsReady, setSettingsReady] = createSignal(false);
  const [includeSelection, setIncludeSelection] = createSignal(false);
  const [theme, setTheme] = createSignal<Theme>();
  const [settingsStatus, setSettingsStatus] = createSignal("設定を読み込み中…");
  const [capturing, setCapturing] = createSignal(false);
  const [captured, setCaptured] = createSignal<PageInfo>();
  const [pageStatus, setPageStatus] = createSignal(app.preview
    ? "プレビューでは固定のサンプル情報を表示します。"
    : "開いているページのタイトル・URL・選択テキストを取得します。");
  const show = (message: string, state: FeedbackState = "idle") => setFeedback({ message, state });
  const count = () => `${formatter.format(text().length)} / ${formatter.format(MAX_NOTE_LENGTH)}`;
  const accept = (note: Note) => { setText(note.text); setSavedText(note.text); };

  void app.notes.loadNote(undefined).then((note) => {
    if (disposed) return;
    accept(note);
    setBusy(undefined);
    show("準備できました。このブラウザに保存できます。");
  }, () => { if (!disposed) show("読み込めませんでした。開き直してください。", "error"); });

  async function perform(action: "save" | "import", operation: () => Promise<Note>, pending: string, success: string, failure: string) {
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
    setSettingsStatus(changed ? "設定の変更を受け取りました。再読み込みなしで反映しています。" : "設定画面の変更を自動で反映します。");
  }, () => {
    setSettingsReady(false);
    setSettingsStatus("設定を読み出せません。設定画面で初期設定に戻してください。");
  }));
  onCleanup(() => { disposed = true; });

  function capture() {
    if (!settingsReady() || capturing()) return;
    setCapturing(true);
    setPageStatus("ページ情報を取得中…");
    void app.page.capture(undefined).then((info) => {
      if (disposed) return;
      setCaptured(includeSelection() ? info : withoutSelection(info));
      setPageStatus(app.preview ? "プレビュー用のサンプルです。実際のページ情報ではありません。" : "取得しました。この画面での表示のみで、保存・外部送信はしません。");
    }, (error: unknown) => {
      if (disposed) return;
      setCaptured(undefined);
      setPageStatus(error instanceof Error ? error.message : "ページ情報を取得できませんでした。");
    }).finally(() => { if (!disposed) setCapturing(false); });
  }

  return (
    <>
      <div class="popup-toolbar">
        <p class="intro-copy">思いついたことを、忘れないうちに。</p>
        <a href="./options.html" target="_blank" rel="noopener" class="btn btn-ghost btn-xs">設定 ↗</a>
      </div>

      <section class="card bg-base-100 note-card" aria-labelledby="note-title">
        <form ref={form} class="card-body" onSubmit={(event) => {
          event.preventDefault();
          void perform("save", () => app.notes.saveNote({ text: text() }), "保存中…", "保存しました", "保存できませんでした。再度お試しください。");
        }}>
          <div class="note-heading">
            <label id="note-title" class="note-label" for="note">
              <svg class="size-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m14 5 5 5M4 20l4.5-1 12-12a2.1 2.1 0 0 0-3-3l-12 12L4 20Z" />
              </svg>
              今日のメモ
            </label>
            <span class="badge badge-sm badge-soft badge-primary note-counter" id="note-count" aria-live="off">{count()}</span>
          </div>
          <textarea id="note" name="note" class="textarea textarea-ghost note-editor" rows={5} maxLength={MAX_NOTE_LENGTH}
            placeholder={"次にやりたいこと、気になったこと。\nここは、あなたの小さなメモ帳。"}
            aria-describedby="note-help note-count" disabled={busy() !== undefined} value={text()}
            onInput={(event) => {
              setText(event.currentTarget.value);
              const dirty = text() !== savedText();
              show(dirty ? "未保存の変更があります" : "保存済みの内容です", dirty ? "dirty" : "idle");
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
                event.preventDefault();
                if (!busy()) form.requestSubmit();
              }
            }} />
          <div class="note-actions">
            <p id="note-help" class="keyboard-hint"><kbd class="kbd kbd-xs">Ctrl / ⌘</kbd><kbd class="kbd kbd-xs">↵</kbd><span>で保存</span></p>
            <ActionButton type="submit" class="btn btn-primary btn-sm save-button" disabled={busy() !== undefined} loading={busy() === "save"}
              icon={<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}>
              保存する
            </ActionButton>
          </div>
        </form>
      </section>

      <Feedback message={feedback().message} state={feedback().state} />

      <section class="card bg-base-100 page-card" aria-labelledby="capture-title">
        <div class="card-body">
          <div class="page-heading">
            <h2 id="capture-title">今見ているページ</h2>
            <Show when={app.preview}><span class="badge badge-soft badge-sm">プレビュー</span></Show>
          </div>
          <button id="capture-page" class="btn btn-outline btn-primary btn-sm" type="button" aria-describedby="page-status"
            disabled={!settingsReady() || capturing()} aria-busy={capturing()} onClick={capture}>ページ情報を取得</button>
          <p id="page-status" class="page-help" role="status" aria-live="polite">{pageStatus()}</p>
          <Show when={captured()}>{(info) => (
            <div class="page-result">
              <h3>{info().title || "タイトルなし"}</h3>
              <p class="page-url">{info().url}</p>
              <blockquote>{includeSelection() ? info().selection || "選択された文章はありません。" : "選択テキストの取得は OFF です。"}</blockquote>
              <Show when={includeSelection() && info().selectionTruncated}>
                <p class="page-help">選択テキストは先頭 2,000 文字まで表示しています。</p>
              </Show>
            </div>
          )}</Show>
        </div>
      </section>

      <details class="card sample-card coffee-details">
        <summary>☕ REST サンプル · コーヒー情報を取得</summary>
        <div class="card-body">
          <ActionButton type="button" class="btn btn-soft btn-sm sample-button" describedBy="sample-help"
            disabled={busy() !== undefined} loading={busy() === "import"} iconPosition="end"
            onClick={() => void perform("import", () => app.notes.importNote({ id: 1 }), "サンプルを取得中…", "サンプルを保存しました", "取得または保存に失敗しました。再度お試しください。")}
            icon={<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>}>
            サンプルを取得して保存
          </ActionButton>
          <p id="sample-help" class="sample-help">SampleAPIs のコーヒー情報で、現在のメモを置き換えます。</p>
        </div>
      </details>

      <aside class="live-settings" aria-label="反映中の設定">
        <p>
          <span class="live-dot" aria-hidden="true" /> <span>{theme() ? themeNames[theme()!] : "読み込み中"}</span>
          <span class="settings-divider">/</span>選択テキスト <strong>{theme() ? (includeSelection() ? "ON" : "OFF") : "—"}</strong>
        </p>
        <p role="status" aria-live="polite">{settingsStatus()}</p>
      </aside>
    </>
  );
}
