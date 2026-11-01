import type { NoteActions } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { SiteAccessActions, SiteAccessChanges } from "../../../features/site-access/ports";
import type { SiteAccess } from "../../../features/site-access/access";
import { applyTheme, connectSettings } from "../../settings";
import template from "./sidepanel.html?raw";

export interface SidepanelApplication {
  notes: NoteActions; page: PageActions;
  settings: SettingsActions; settingsChanges: SettingsChanges;
  access: SiteAccessActions; accessChanges: SiteAccessChanges;
  preview: boolean;
}

export function mountSidepanel(root: HTMLElement, app: SidepanelApplication): () => void {
  root.innerHTML = template;
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const note = get<HTMLTextAreaElement>("panel-note");
  const form = get<HTMLFormElement>("panel-note-form");
  const save = get<HTMLButtonElement>("panel-save");
  const importButton = get<HTMLButtonElement>("panel-import");
  const capture = get<HTMLButtonElement>("panel-capture");
  const allow = get<HTMLButtonElement>("panel-allow");
  const result = get("panel-result");
  let disposed = false;
  let noteBusy = true;
  let savedText = "";
  let settingsReady = false;
  let includeSelection = false;
  let site: SiteAccess | undefined;
  let revision = 0;
  let capturing = false;
  let granting = false;
  let captured: PageInfo | undefined;

  function message(id: string, text: string, error = false) {
    const element = get(id); element.textContent = text; element.dataset.error = String(error);
  }
  function count() { get("panel-count").textContent = `${note.value.length.toLocaleString("ja-JP")} / ${MAX_NOTE_LENGTH.toLocaleString("ja-JP")}`; }
  function setNoteBusy(value: boolean) {
    noteBusy = value; note.disabled = value; save.disabled = value; importButton.disabled = value;
    form.setAttribute("aria-busy", String(value));
  }
  function updateCapture() {
    capture.disabled = !settingsReady || !site?.available || !site.allowed || capturing || granting;
    capture.setAttribute("aria-busy", String(capturing));
    allow.disabled = granting || !site?.available;
    allow.setAttribute("aria-busy", String(granting));
  }
  function clearResult() { captured = undefined; result.hidden = true; }
  function renderResult(info: PageInfo) {
    result.hidden = false;
    get("panel-result-title").textContent = info.title || "タイトルなし";
    get("panel-result-url").textContent = info.url;
    get("panel-result-selection").textContent = includeSelection ? info.selection || "選択された文章はありません。" : "選択テキストの取得は OFF です。";
    get("panel-truncated").hidden = !includeSelection || !info.selectionTruncated;
  }

  async function refreshAccess() {
    const current = ++revision;
    site = undefined; clearResult(); updateCapture();
    allow.hidden = true;
    message("panel-access-status", "アクセス状態を確認しています。");
    message("panel-page-status", "タイトル・URL・選択テキストを取得します。");
    try {
      const value = await app.access.status(undefined);
      if (disposed || current !== revision) return;
      site = value;
      get("panel-site").textContent = value.available ? value.origin : "取得できるページがありません";
      allow.hidden = !value.available || value.allowed;
      message("panel-access-status", !value.available ? value.reason : app.preview ? "プレビューでは固定のサンプル情報を表示します。" : value.allowed ? "このサイトは取得できます。文章を選んでから取得してください。" : "初回は、このサイトへのアクセスを許可してください。");
    } catch {
      if (!disposed && current === revision) message("panel-access-status", "ページを確認できません。パネルを開き直してください。", true);
    } finally { if (!disposed && current === revision) updateCapture(); }
  }

  get("panel-preview").hidden = !app.preview;
  const stopAccess = app.accessChanges.subscribe(() => { void refreshAccess(); });
  const stopSettings = connectSettings(app.settings, app.settingsChanges, (value, changed) => {
    settingsReady = true; includeSelection = value.includeSelection; applyTheme(value);
    if (captured && !includeSelection) captured = { ...captured, selection: "", selectionTruncated: false };
    if (captured) renderResult(captured);
    message("panel-settings-status", changed ? "設定の変更を再読み込みなしで反映しました。" : "設定画面の変更を自動で反映します。");
    updateCapture();
  }, () => {
    settingsReady = false; includeSelection = false; clearResult(); updateCapture();
    message("panel-settings-status", "設定を読み出せません。設定画面でリセットしてください。", true);
  });

  allow.addEventListener("click", () => {
    if (!site?.available || granting) return;
    granting = true; updateCapture();
    // No await before grant: Chrome needs the user gesture for its permission prompt.
    void app.access.grant({ origin: site.origin }).then(async (granted) => {
      if (disposed) return;
      await refreshAccess();
      if (!disposed && !granted) message("panel-access-status", "許可されませんでした。取得する場合はもう一度許可してください。");
    }, () => { if (!disposed) message("panel-access-status", "サイトを許可できませんでした。もう一度お試しください。", true); })
      .finally(() => { granting = false; if (!disposed) updateCapture(); });
  });
  capture.addEventListener("click", () => {
    if (capture.disabled) return;
    const current = revision;
    capturing = true; updateCapture();
    message("panel-page-status", "ページ情報を取得中…");
    void app.page.capture(undefined).then((info) => {
      if (disposed || current !== revision) return;
      captured = includeSelection ? info : { ...info, selection: "", selectionTruncated: false };
      renderResult(captured);
      message("panel-page-status", app.preview ? "プレビュー用の固定データです。" : "取得しました。表示のみで、保存・外部送信はしません。");
    }, (error: unknown) => {
      if (disposed || current !== revision) return;
      clearResult(); message("panel-page-status", error instanceof Error ? error.message : "取得できませんでした。", true);
    }).finally(() => { capturing = false; if (!disposed) updateCapture(); });
  });

  note.maxLength = MAX_NOTE_LENGTH;
  note.addEventListener("input", () => { count(); message("panel-note-status", note.value === savedText ? "保存済みの内容です。" : "未保存の変更があります。"); });
  note.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) { event.preventDefault(); if (!noteBusy) form.requestSubmit(); }
  });
  async function perform(operation: () => Promise<Note>) {
    if (noteBusy) return;
    setNoteBusy(true); message("panel-note-status", "保存中…");
    try {
      const value = await operation();
      if (disposed) return;
      note.value = savedText = value.text; count(); message("panel-note-status", "保存しました。");
    } catch { if (!disposed) message("panel-note-status", "保存できませんでした。入力を残しています。", true); }
    finally { if (!disposed) setNoteBusy(false); }
  }
  form.addEventListener("submit", (event) => { event.preventDefault(); void perform(() => app.notes.saveNote({ text: note.value })); });
  importButton.addEventListener("click", () => { void perform(() => app.notes.importNote({ id: 1 })); });
  void app.notes.loadNote(undefined).then((value) => {
    if (disposed) return;
    note.value = savedText = value.text; count(); setNoteBusy(false); message("panel-note-status", "このブラウザに保存できます。");
  }, () => { if (!disposed) message("panel-note-status", "メモを読み込めませんでした。開き直してください。", true); });
  void refreshAccess();
  return () => { disposed = true; revision++; stopAccess(); stopSettings(); };
}
