// Sample screen: opened by the worker on install. Lists the keys Chrome actually assigned.
import { createResource, For, onCleanup, Show } from "solid-js";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import type { ShortcutGuide } from "../../../features/welcome/ports";
import { applyTheme, connectSettings } from "../../settings";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

export interface WelcomeApplication {
  settings: SettingsActions;
  settingsChanges: SettingsChanges;
  shortcuts: ShortcutGuide;
  preview: boolean;
}

// Descriptions come from the manifest through Chrome; these cover names Chrome reports without one.
const fallbackDescriptions: Record<string, MessageKey> = { _execute_action: "commandOpen", "append-selection": "commandAppendSelection" };

export function Welcome(props: { app: WelcomeApplication; optionsHref: string }) {
  const { t } = useI18n();
  onCleanup(connectSettings(props.app.settings, props.app.settingsChanges, (value) => applyTheme(value), () => {}));
  const [shortcuts] = createResource(() => props.app.shortcuts.list());
  const describe = (name: string, description: string) => description || (fallbackDescriptions[name] ? t(fallbackDescriptions[name]) : name);

  return (
    <>
      <section class="welcome-heading">
        <p class="eyebrow">{t("welcomeEyebrow")}</p>
        <h2>{t("welcomeHeading")}</h2>
        <p>{t("welcomeIntro")}</p>
        <p>{t("welcomePinHint")}</p>
      </section>
      <section class="card bg-base-100 welcome-card" aria-labelledby="shortcuts-title">
        <div class="card-body">
          <h3 id="shortcuts-title">{t("welcomeShortcutsHeading")}</h3>
          <p class="welcome-help">{t("welcomeShortcutsHelp")}</p>
          <Show when={!shortcuts.error} fallback={<p class="welcome-help" role="status">{t("welcomeShortcutsFailed")}</p>}>
            <dl class="welcome-shortcuts" id="welcome-shortcuts">
              <For each={shortcuts() ?? []}>{(shortcut) => (
                <div data-command={shortcut.name}>
                  <dt>{describe(shortcut.name, shortcut.description)}</dt>
                  <dd>{shortcut.keys ? <kbd class="kbd kbd-sm">{shortcut.keys}</kbd> : <span class="welcome-unset">{t("welcomeShortcutUnset")}</span>}</dd>
                </div>
              )}</For>
            </dl>
          </Show>
          <Show when={props.app.preview}><p class="welcome-help">{t("welcomePreviewNote")}</p></Show>
          <div class="welcome-actions">
            <button type="button" class="btn btn-outline btn-sm" id="change-shortcuts" disabled={props.app.preview}
              onClick={() => void props.app.shortcuts.openSettings().catch(() => {})}>{t("welcomeChangeShortcuts")}</button>
            <a class="btn btn-primary btn-sm" href={props.optionsHref} target="_blank" rel="noopener">{t("welcomeOpenSettings")}</a>
          </div>
        </div>
      </section>
    </>
  );
}
