import type { JSX } from "solid-js";
import { useI18n } from "../i18n";

export function ExtensionShell(props: { children: JSX.Element }) {
  const { t } = useI18n();
  return (
    <div class="extension-shell">
      <header class="app-header">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
            <path d="M9 3.5v17M12 8h4M12 12h4M3.5 8h3M3.5 12h3M3.5 16h3" />
          </svg>
        </div>
        <div class="brand-copy">
          <p class="eyebrow">{t("shellEyebrow")}</p>
          <h1>Quick Note<span class="text-primary">.</span></h1>
        </div>
        <span class="badge badge-sm badge-ghost private-badge" aria-label={t("shellLocalBadgeLabel")}>
          <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {t("shellLocalBadge")}
        </span>
      </header>
      <main>{props.children}</main>
      <footer class="app-footer">
        <span class="footer-line" />
        <span class="footer-caption">
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m12 3 8 3v5c0 5-4.5 8.5-8 10-3.5-1.5-8-5-8-10V6l8-3Z" /><path d="m8 12 3 3 5-6" />
          </svg>
          {t("shellFooter")}
        </span>
        <span class="footer-line" />
      </footer>
    </div>
  );
}
