import { children, createSignal, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import { applyTheme, connectSettings } from "../../settings";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";
import { EmptyState } from "../../components/empty-state";

// The base frame. Feature sections are placed as children by the entrypoint.
export interface SidepanelApplication {
  settings: SettingsActions;
  settingsChanges: SettingsChanges;
  preview: boolean;
}

export function Sidepanel(props: { app: SidepanelApplication; children?: JSX.Element }) {
  const { t } = useI18n();
  const sections = children(() => props.children);
  const [status, setStatus] = createSignal<{ key: MessageKey; error: boolean }>({ key: "settingsLoading", error: false });

  onCleanup(connectSettings(props.app.settings, props.app.settingsChanges, (value, changed) => {
    applyTheme(value);
    setStatus({ key: changed ? "sidepanelSettingsChanged" : "settingsAutoApply", error: false });
  }, () => setStatus({ key: "sidepanelSettingsUnreadable", error: true })));

  return (
    <main class="panel-shell">
      <header class="panel-header">
        <div class="panel-brand"><span class="panel-mark" aria-hidden="true">{t("appName").charAt(0)}</span><div><h1>{t("appName")}<span> .</span></h1><p>{t("sidepanelTagline")}</p></div></div>
        <a href="./sidepanel-options.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">{t("openSettings")}</a>
      </header>
      <Show when={sections.toArray().length > 0} fallback={<EmptyState class="panel-card" />}>{sections()}</Show>
      <footer class="panel-footer">
        <p role="status" aria-live="polite" data-error={String(status().error)}>{t(status().key)}</p>
        <p>{t("sidepanelStorageNote")}</p>
      </footer>
    </main>
  );
}
