// Sample content script: the worker injects it into the tab after appending to the note.
// It shows the notice with an Undo button and, when pressed, asks the worker to undo with a message.
// The page itself never reaches the extension's storage; the worker validates the request and does the work.
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createChromeTranslator } from "../infrastructure/i18n";
import { renderPageToast } from "../infrastructure/page-toast";
import { requestUndoAppend } from "../features/notes/gateways/worker";
import { NoteUndoError } from "../features/notes/note";
import type { MessageKey } from "../composition/i18n";
import { colors } from "#palette/colors";

const { t } = createChromeTranslator<MessageKey>(chrome.i18n);
const client = createMessageClient(createChromeTransport(chrome.runtime));

renderPageToast(t("toastAppended"), "success", 8_000, colors.notice, {
  label: t("toastUndo"),
  run() {
    requestUndoAppend(client).then(
      () => renderPageToast(t("toastUndone"), "success", 4_000, colors.notice),
      (error: unknown) => renderPageToast(t(error instanceof NoteUndoError && error.reason === "changed" ? "toastUndoChanged" : "toastUndoFailed"), "error", 4_000, colors.notice),
    );
  },
});
