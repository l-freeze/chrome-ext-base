// Sample section: coffees added to the SampleAPIs list since the user last looked. The worker checks on
// a schedule and counts them on the toolbar badge; opening the section shows them and marks them as seen.
import { createSignal, For, onCleanup, Show } from "solid-js";
import type { ArrivalsActions } from "../../../features/arrivals/ports";
import type { ArrivalsView } from "../../../features/arrivals/arrival";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";
import { ActionButton } from "../../components/action-button";

export function ArrivalsSection(props: { arrivals: ArrivalsActions }) {
  const { t, language } = useI18n();
  const time = new Intl.DateTimeFormat(language, { dateStyle: "short", timeStyle: "short" });
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const [count, setCount] = createSignal(0);
  const [shown, setShown] = createSignal<ArrivalsView>();
  const [busy, setBusy] = createSignal(false);
  const [status, setStatus] = createSignal<MessageKey>();

  void props.arrivals.loadArrivals(undefined).then((view) => { if (!disposed) setCount(view.fresh.length); }, () => {});

  // Entries already on screen stay listed after a later review in the same session.
  const show = (view: ArrivalsView) => {
    const before = shown()?.fresh ?? [];
    setShown({ ...view, fresh: [...before, ...view.fresh.filter((entry) => !before.some((seen) => seen.id === entry.id))] });
    setCount(0);
  };
  async function review() {
    try { const view = await props.arrivals.reviewArrivals(undefined); if (!disposed) show(view); }
    catch { if (!disposed) setStatus("arrivalsLoadFailed"); }
  }
  async function check() {
    if (busy()) return;
    setBusy(true);
    setStatus("arrivalsChecking");
    try {
      await props.arrivals.checkArrivals(undefined);
      if (disposed) return;
      setStatus(undefined);
      await review();
    } catch {
      if (!disposed) setStatus("arrivalsFailed");
    } finally {
      if (!disposed) setBusy(false);
    }
  }

  return (
    <details class="card panel-rest panel-arrivals" onToggle={(event) => { if (event.currentTarget.open && !shown()) void review(); }}>
      <summary>
        {t("arrivalsSummary")}
        <Show when={count() > 0}><span class="badge badge-sm panel-arrivals-count">{t("arrivalsCount", new Intl.NumberFormat(language).format(count()))}</span></Show>
      </summary>
      <div class="card-body">
        <p class="panel-description">{t("arrivalsHelp")}</p>
        <Show when={shown()}>{(view) => (
          <>
            <Show when={view().fresh.length > 0} fallback={<p class="panel-description">{t(view().lastCheckedAt === null ? "arrivalsNotChecked" : "arrivalsEmpty")}</p>}>
              <ul class="panel-arrivals-list"><For each={view().fresh}>{(entry) => <li>{entry.title}</li>}</For></ul>
            </Show>
            <Show when={view().lastCheckedAt !== null}><p class="panel-arrivals-time">{t("arrivalsLastChecked", time.format(view().lastCheckedAt!))}</p></Show>
          </>
        )}</Show>
        <ActionButton type="button" class="btn btn-soft" disabled={busy()} loading={busy()} onClick={() => void check()}
          icon={<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" /></svg>}>
          {t("arrivalsCheck")}
        </ActionButton>
        <Show when={status()}>{(key) => <p class="panel-description" role="status" aria-live="polite">{t(key())}</p>}</Show>
      </div>
    </details>
  );
}
