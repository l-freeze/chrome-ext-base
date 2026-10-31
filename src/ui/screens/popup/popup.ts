import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import { applyTheme, connectSettings } from "../../settings";
import type { NoteActions } from "../../../features/notes/ports";
import { MAX_NOTE_LENGTH } from "../../../features/notes/note";
import type { Note } from "../../../features/notes/note";
import { createActionButton } from "../../components/action-button";
import { createFeedback } from "../../components/feedback";
import template from "./popup.html?raw";

export interface PopupApplication {
  notes: NoteActions;
  settings: SettingsActions;
  settingsChanges: SettingsChanges;
  page: PageActions;
  preview: boolean;
}

export function mountPopup(root: HTMLElement, dependencies: PopupApplication): () => void {
  const application = dependencies.notes;
  root.innerHTML = template;
  const form = root.querySelector<HTMLFormElement>("#note-form")!;
  const note = root.querySelector<HTMLTextAreaElement>("#note")!;
  const counter = root.querySelector<HTMLElement>("#note-count")!;
  const saveButton = createActionButton(root.querySelector<HTMLButtonElement>("button[type=submit]")!);
  const importElement = root.querySelector<HTMLButtonElement>("#import-sample")!;
  const importButton = createActionButton(importElement);
  const feedback = createFeedback(root.querySelector<HTMLElement>("#status")!);
  const formatter = new Intl.NumberFormat("ja-JP");
  let busy = true;
  let savedText = "";
  note.maxLength = MAX_NOTE_LENGTH;

  function updateCounter() {
    counter.textContent = `${formatter.format(note.value.length)} / ${formatter.format(MAX_NOTE_LENGTH)}`;
  }

  function setBusy(value: boolean, action?: "save" | "import") {
    busy = value;
    note.disabled = value;
    saveButton.update({ disabled: value, loading: value && action === "save" });
    importButton.update({ disabled: value, loading: value && action === "import" });
  }

  async function initialize() {
    try {
      const saved = await application.loadNote(undefined);
      note.value = savedText = saved.text;
      updateCounter();
      setBusy(false);
      feedback.show("準備できました。このブラウザに保存できます。");
    } catch {
      feedback.show("読み込めませんでした。開き直してください。", "error");
    }
  }

  async function perform(
    action: "save" | "import", operation: () => Promise<Note>,
    pending: string, success: string, failure: string,
  ) {
    if (busy) return;
    setBusy(true, action);
    feedback.show(pending, "loading");
    try {
      const saved = await operation();
      note.value = savedText = saved.text;
      updateCounter();
      feedback.show(success, "success");
    } catch {
      feedback.show(failure, "error");
    } finally {
      setBusy(false);
    }
  }

  note.addEventListener("input", () => {
    updateCounter();
    const dirty = note.value !== savedText;
    feedback.show(dirty ? "未保存の変更があります" : "保存済みの内容です", dirty ? "dirty" : "idle");
  });

  note.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      if (!busy) form.requestSubmit();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void perform("save", () => application.saveNote({ text: note.value }),
      "保存中…", "保存しました", "保存できませんでした。再度お試しください。");
  });

  importElement.addEventListener("click", () => {
    void perform("import", () => application.importNote({ id: 1 }),
      "サンプルを取得中…", "サンプルを保存しました",
      "取得または保存に失敗しました。再度お試しください。");
  });

  const pageButton = root.querySelector<HTMLButtonElement>("#capture-page")!;
  const pageStatus = root.querySelector<HTMLElement>("#page-status")!;
  const pageResult = root.querySelector<HTMLElement>("#page-result")!;
  const selection = root.querySelector<HTMLElement>("#page-selection")!;
  const settingsStatus = root.querySelector<HTMLElement>("#settings-status")!;
  const selectionSetting = root.querySelector<HTMLElement>("#selection-setting")!;
  let includeSelection = false;
  let settingsReady = false;
  let capturing = false;
  let disposed = false;
  let captured: PageInfo | undefined;
  if (dependencies.preview) {
    root.querySelector<HTMLElement>("#preview-label")!.hidden = false;
    pageStatus.textContent = "プレビューでは固定のサンプル情報を表示します。";
  }

  function renderPage(info: PageInfo) {
    pageResult.hidden = false;
    root.querySelector<HTMLElement>("#page-title")!.textContent = info.title || "タイトルなし";
    root.querySelector<HTMLElement>("#page-url")!.textContent = info.url;
    selection.textContent = includeSelection
      ? info.selection || "選択された文章はありません。"
      : "選択テキストの取得は OFF です。";
    root.querySelector<HTMLElement>("#page-truncated")!.hidden = !includeSelection || !info.selectionTruncated;
  }

  const disconnect = connectSettings(dependencies.settings, dependencies.settingsChanges, (value, changed) => {
    applyTheme(value);
    settingsReady = true;
    includeSelection = value.includeSelection;
    pageButton.disabled = capturing;
    if (!includeSelection && captured) captured = { ...captured, selection: "", selectionTruncated: false };
    if (captured) renderPage(captured);
    const names = { system: "端末に合わせる", light: "ライト", dark: "ダーク" };
    root.querySelector<HTMLElement>("#theme-setting")!.textContent = names[value.theme];
    selectionSetting.textContent = includeSelection ? "ON" : "OFF";
    settingsStatus.textContent = changed ? "設定の変更を受け取りました。再読み込みなしで反映しています。" : "設定画面で保存した変更が、この画面にも反映されます。";
  }, () => {
    settingsReady = false;
    pageButton.disabled = true;
    settingsStatus.textContent = "設定を読み出せません。設定画面で初期設定に戻してください。";
  });

  pageButton.addEventListener("click", () => {
    if (!settingsReady || capturing) return;
    capturing = true;
    pageButton.disabled = true;
    pageButton.setAttribute("aria-busy", "true");
    pageStatus.textContent = "ページ情報を取得中…";
    void dependencies.page.capture(undefined).then((info) => {
      if (disposed) return;
      captured = includeSelection ? info : { ...info, selection: "", selectionTruncated: false };
      renderPage(captured);
      pageStatus.textContent = dependencies.preview ? "プレビュー用のサンプルです。実際のページ情報ではありません。" : "取得しました。この画面での表示のみで、保存・外部送信はしません。";
    }, (error: unknown) => {
      if (disposed) return;
      captured = undefined;
      pageResult.hidden = true;
      pageStatus.textContent = error instanceof Error ? error.message : "ページ情報を取得できませんでした。";
    }).finally(() => {
      capturing = false;
      if (!disposed) {
        pageButton.disabled = !settingsReady;
        pageButton.setAttribute("aria-busy", "false");
      }
    });
  });

  void initialize();
  return () => { disposed = true; disconnect(); };
}
