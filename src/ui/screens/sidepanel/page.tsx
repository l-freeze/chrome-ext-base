// Sample section: per-site access and capture of the panel window's active tab, with its own selection preference.
import { createSignal, onCleanup, Show } from "solid-js";
import type { PageActions } from "../../../features/page/ports";
import type { PageInfo } from "../../../features/page/page";
import { PageCaptureError } from "../../../features/page/page";
import type { SiteAccessActions, SiteAccessChanges } from "../../../features/site-access/ports";
import type { SiteAccess, SiteUnavailable } from "../../../features/site-access/access";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";
import { message, Status } from "./status";

const unavailable: Record<SiteUnavailable, MessageKey> = {
  "no-tab": "sidepanelAccessNoTab", "invalid-url": "sidepanelAccessInvalidUrl", "unsupported-page": "sidepanelAccessUnsupported",
};
const failures: Record<PageCaptureError["reason"], MessageKey> = { "unsupported-page": "captureUnsupportedPage", blocked: "captureBlocked" };

export function PageSection(props: { page: PageActions; access: SiteAccessActions; accessChanges: SiteAccessChanges; preview: boolean }) {
  const { t, language } = useI18n();
  const formatter = new Intl.NumberFormat(language);
  let disposed = false;
  // Increments on every page or permission change; older async results are discarded.
  let revision = 0;
  const [includeSelection, setIncludeSelection] = createSignal<boolean>();
  const [site, setSite] = createSignal<SiteAccess>();
  const [siteLabel, setSiteLabel] = createSignal<string>(t("sidepanelSiteChecking"));
  const [accessStatus, setAccessStatus] = createSignal(message("sidepanelAccessChecking"));
  const [pageStatus, setPageStatus] = createSignal(message("sidepanelPageReady"));
  const [capturing, setCapturing] = createSignal(false);
  const [granting, setGranting] = createSignal(false);
  const [captured, setCaptured] = createSignal<PageInfo>();
  const available = () => { const value = site(); return value?.available ? value : undefined; };

  async function refreshAccess() {
    const current = ++revision;
    setSite(undefined); setCaptured(undefined);
    setAccessStatus(message("sidepanelAccessChecking"));
    setPageStatus(message("sidepanelPageReady"));
    try {
      const value = await props.access.status(undefined);
      if (disposed || current !== revision) return;
      setSite(value);
      setSiteLabel(value.available ? value.origin : t("sidepanelSiteNone"));
      setAccessStatus(message(!value.available ? unavailable[value.reason] : props.preview ? "previewSampleIntro" : value.allowed ? "sidepanelAccessAllowed" : "sidepanelAccessNeeded"));
    } catch {
      if (!disposed && current === revision) setAccessStatus(message("sidepanelAccessCheckFailed", true));
    }
  }

  onCleanup(props.accessChanges.subscribe(() => { void refreshAccess(); }));
  onCleanup(() => { disposed = true; revision++; });
  void props.page.loadPreferences(undefined).then((value) => {
    if (!disposed) setIncludeSelection(value.includeSelection);
  }, () => { if (!disposed) setPageStatus(message("capturePreferencesFailed", true)); });
  void refreshAccess();

  function toggle(value: boolean) {
    const previous = includeSelection();
    setIncludeSelection(value);
    // Turning the preference off also discards a selection that was already captured.
    const current = captured();
    if (!value && current) setCaptured({ ...current, selection: "", selectionTruncated: false });
    void props.page.savePreferences({ includeSelection: value }).catch(() => {
      if (disposed) return;
      setIncludeSelection(previous);
      setPageStatus(message("capturePreferencesFailed", true));
    });
  }

  function grant() {
    const value = available();
    if (!value || granting()) return;
    setGranting(true);
    // No await before grant: Chrome needs the user gesture for its permission prompt.
    void props.access.grant({ origin: value.origin }).then(async (granted) => {
      if (disposed) return;
      await refreshAccess();
      if (!disposed && !granted) setAccessStatus(message("sidepanelAccessDenied"));
    }, () => { if (!disposed) setAccessStatus(message("sidepanelAccessGrantFailed", true)); })
      .finally(() => { if (!disposed) setGranting(false); });
  }

  const captureDisabled = () => includeSelection() === undefined || !available()?.allowed || capturing() || granting();
  function capture() {
    if (captureDisabled()) return;
    const current = revision;
    setCapturing(true);
    setPageStatus(message("captureCapturing"));
    void props.page.capture(undefined).then((info) => {
      if (disposed || current !== revision) return;
      setCaptured(info);
      setPageStatus(message(props.preview ? "sidepanelCapturedPreview" : "sidepanelCaptured"));
    }, (error: unknown) => {
      if (disposed || current !== revision) return;
      setCaptured(undefined);
      setPageStatus(message(error instanceof PageCaptureError ? failures[error.reason] : "sidepanelCaptureFailed", true));
    }).finally(() => { if (!disposed) setCapturing(false); });
  }

  return (
    <section class="card panel-card" aria-labelledby="panel-page-title">
      <div class="card-body">
        <div class="panel-section-heading">
          <h2 id="panel-page-title">{t("pageHeading")}</h2>
          <Show when={props.preview}><span class="badge badge-soft badge-sm">{t("previewBadge")}</span></Show>
        </div>
        <p class="panel-description">{t("sidepanelPageIntro")}</p>
        <div class="panel-site"><span class="panel-site-dot" aria-hidden="true" /><span>{siteLabel()}</span></div>
        <Status value={accessStatus()} />
        <Show when={available() && !available()!.allowed}>
          <button type="button" class="btn btn-soft btn-primary" disabled={granting()} aria-busy={granting()} onClick={grant}>{t("sidepanelAllow")}</button>
        </Show>
        <label class="panel-option">
          <input type="checkbox" class="toggle toggle-primary toggle-sm" checked={includeSelection() ?? false}
            disabled={includeSelection() === undefined} onChange={(event) => toggle(event.currentTarget.checked)} />
          {t("captureIncludeSelection")}
        </label>
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
  );
}
