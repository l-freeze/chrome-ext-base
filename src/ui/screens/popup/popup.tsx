import { children, createSignal, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { Theme } from "../../../features/settings/settings";
import { applyTheme, connectSettings } from "../../settings";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";
import { EmptyState } from "../../components/empty-state";

// The base frame. Feature sections are placed as children by the entrypoint.
export interface PopupApplication {
  settings: SettingsActions;
  settingsChanges: SettingsChanges;
  preview: boolean;
}

const themeNames: Record<Theme, MessageKey> = { system: "themeSystem", light: "themeLight", dark: "themeDark" };

export function Popup(props: { app: PopupApplication; children?: JSX.Element }) {
  const { t } = useI18n();
  const sections = children(() => props.children);
  const [theme, setTheme] = createSignal<Theme>();
  const [settingsStatus, setSettingsStatus] = createSignal<MessageKey>("settingsLoading");

  onCleanup(connectSettings(props.app.settings, props.app.settingsChanges, (value, changed) => {
    applyTheme(value);
    setTheme(value.theme);
    setSettingsStatus(changed ? "popupSettingsChanged" : "settingsAutoApply");
  }, () => setSettingsStatus("popupSettingsUnreadable")));

  return (
    <>
      <div class="popup-toolbar">
        <p class="intro-copy">{t("popupIntro")}</p>
        <a href="./options.html" target="_blank" rel="noopener" class="btn btn-ghost btn-xs">{t("openSettings")}</a>
      </div>
      <Show when={sections.toArray().length > 0} fallback={<EmptyState />}>{sections()}</Show>
      <aside class="live-settings" aria-label={t("popupLiveSettingsLabel")}>
        <p>
          <span class="live-dot" aria-hidden="true" /> {t("popupLiveTheme")}
          <span class="settings-divider">/</span><strong>{theme() ? t(themeNames[theme()!]) : "—"}</strong>
        </p>
        <p role="status" aria-live="polite">{t(settingsStatus())}</p>
      </aside>
    </>
  );
}
