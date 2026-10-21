import type { NoteController } from "../../../adapters/inbound/note-controller";
import { MAX_NOTE_LENGTH } from "../../../domain/note";
import type { Note } from "../../../domain/note";
import { createActionButton } from "../../components/action-button";
import { createFeedback } from "../../components/feedback";
import template from "./popup.html?raw";

export function mountPopup(root: HTMLElement, application: NoteController) {
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

  void initialize();
}
