// Sample section: capture the active tab's title, URL, and selection, with its own selection preference.
import { createSignal, onCleanup, Show } from "solid-js";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import { PageCaptureError } from "../../../features/page/page";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

const failures: Record<PageCaptureError["reason"], MessageKey> = { "unsupported-page": "captureUnsupportedPage", blocked: "captureBlocked" };

export function PageSection(props: { page: PageActions; preview: boolean }) {
  const { t, language } = useI18n();
  const formatter = new Intl.NumberFormat(language);
  let disposed = false;
  const [includeSelection, setIncludeSelection] = createSignal<boolean>();
  const [capturing, setCapturing] = createSignal(false);
  const [captured, setCaptured] = createSignal<PageInfo>();
  const [status, setStatus] = createSignal<MessageKey>(props.preview ? "previewSampleIntro" : "popupPageIntro");
  onCleanup(() => { disposed = true; });

  void props.page.loadPreferences(undefined).then((value) => {
    if (!disposed) setIncludeSelection(value.includeSelection);
  }, () => { if (!disposed) setStatus("capturePreferencesFailed"); });

  function toggle(value: boolean) {
    const previous = includeSelection();
    setIncludeSelection(value);
    // Turning the preference off also discards a selection that was already captured.
    const current = captured();
    if (!value && current) setCaptured({ ...current, selection: "", selectionTruncated: false });
    void props.page.savePreferences({ includeSelection: value }).catch(() => {
      if (disposed) return;
      setIncludeSelection(previous);
      setStatus("capturePreferencesFailed");
    });
  }

  function capture() {
    if (includeSelection() === undefined || capturing()) return;
    setCapturing(true);
    setStatus("captureCapturing");
    void props.page.capture(undefined).then((info) => {
      if (disposed) return;
      setCaptured(info);
      setStatus(props.preview ? "popupCapturedPreview" : "popupCaptured");
    }, (error: unknown) => {
      if (disposed) return;
      setCaptured(undefined);
      setStatus(error instanceof PageCaptureError ? failures[error.reason] : "popupCaptureFailed");
    }).finally(() => { if (!disposed) setCapturing(false); });
  }

  return (
    <section class="card bg-base-100 page-card" aria-labelledby="capture-title">
      <div class="card-body">
        <div class="page-heading">
          <h2 id="capture-title">{t("pageHeading")}</h2>
          <Show when={props.preview}><span class="badge badge-soft badge-sm">{t("previewBadge")}</span></Show>
        </div>
        <label class="page-option">
          <input type="checkbox" class="toggle toggle-primary toggle-sm" checked={includeSelection() ?? false}
            disabled={includeSelection() === undefined} onChange={(event) => toggle(event.currentTarget.checked)} />
          {t("captureIncludeSelection")}
        </label>
        <button id="capture-page" class="btn btn-outline btn-primary btn-sm" type="button" aria-describedby="page-status"
          disabled={includeSelection() === undefined || capturing()} aria-busy={capturing()} onClick={capture}>{t("captureButton")}</button>
        <p id="page-status" class="page-help" role="status" aria-live="polite">{t(status())}</p>
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
  );
}
