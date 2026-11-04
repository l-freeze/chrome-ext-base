import { useI18n } from "../i18n";

// Shown by a screen frame when no feature section is placed in it.
export function EmptyState(props: { class?: string }) {
  const { t } = useI18n();
  return (
    <section class={`card bg-base-100 empty-state ${props.class ?? ""}`}>
      <div class="card-body">
        <h2>{t("emptyTitle")}</h2>
        <p>{t("emptyBody")}</p>
      </div>
    </section>
  );
}
