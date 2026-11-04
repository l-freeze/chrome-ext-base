import { createSignal, onCleanup } from "solid-js";
import type { Settings } from "../../../features/settings/settings";
import type { SettingsActions, SettingsChanges } from "../../../features/settings/ports";
import { applyTheme, connectSettings } from "../../settings";

// Copy that differs between the popup and sidepanel builds of the shared settings screen.
export interface OptionsVariant {
  previewHref: string;
  themeHelp: string;
  previewNote: string;
}

export function Options(props: { actions: SettingsActions; changes: SettingsChanges; variant: OptionsVariant }) {
  let dialog!: HTMLDialogElement;
  let disposed = false;
  const [theme, setTheme] = createSignal<string>("system");
  const [includeSelection, setIncludeSelection] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  const [busy, setBusy] = createSignal(true);
  const [dirty, setDirty] = createSignal(false);
  const [status, setStatus] = createSignal("設定を読み込み中…");

  function render(value: Settings) {
    setTheme(value.theme);
    setIncludeSelection(value.includeSelection);
    setDirty(false);
    setReady(true);
    applyTheme(value);
  }

  onCleanup(connectSettings(props.actions, props.changes, (value, changed) => {
    applyTheme(value);
    if (changed && (dirty() || busy()) && ready()) {
      if (dirty()) setStatus("別の画面で設定が更新されました。編集中の入力は保持しています。保存すると現在の入力で上書きします。");
      return;
    }
    render(value);
    setBusy(false);
    setStatus(changed ? "別の画面の設定変更を反映しました。" : "設定を読み込みました。");
  }, () => {
    setBusy(false);
    setStatus("設定を読み出せません。リセットして初期設定に戻せます。");
  }));
  onCleanup(() => { disposed = true; });

  async function perform(operation: () => Promise<Settings>, message: string) {
    if (busy()) return;
    setBusy(true);
    setStatus("保存中…");
    try {
      const value = await operation();
      if (disposed) return;
      render(value);
      setStatus(message);
    } catch {
      if (!disposed) setStatus("設定を保存できませんでした。入力を残しています。再度お試しください。");
    } finally {
      if (!disposed) setBusy(false);
    }
  }

  return (
    <>
      <div class="options-heading"><p class="eyebrow">MAKE IT YOURS</p><h2>あなたの使いやすさに。</h2><p>見た目と、ページから取得する情報を設定できます。</p></div>
      <div class="options-grid">
        <section class="card bg-base-100 settings-card" aria-labelledby="settings-title">
          <form class="card-body" aria-busy={busy()}
            onInput={() => { setDirty(true); setStatus("未保存の変更があります。"); }}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready() || busy()) return;
              const input = { theme: theme(), includeSelection: includeSelection() };
              void perform(() => props.actions.save(input), "設定を保存しました。開いている画面にも反映されます。");
            }}>
            <h3 id="settings-title">基本設定</h3>
            <fieldset disabled={busy() || !ready()}>
              <label class="setting-label" for="theme">画面のテーマ</label>
              <p class="setting-description" id="theme-help">{props.variant.themeHelp}</p>
              <select id="theme" name="theme" class="select select-bordered w-full" aria-describedby="theme-help"
                value={theme()} onChange={(event) => setTheme(event.currentTarget.value)}>
                <option value="system">端末に合わせる</option><option value="light">ライト</option><option value="dark">ダーク</option>
              </select>
              <div class="selection-option">
                <div><label class="setting-label" for="include-selection">選択テキストを取得する</label><p id="selection-help" class="setting-description">ページ情報の取得時に、選択した文章も含めます。本文全体やフォーム入力は取得しません。</p></div>
                <input id="include-selection" name="includeSelection" type="checkbox" class="toggle toggle-primary" aria-describedby="selection-help"
                  checked={includeSelection()} onChange={(event) => setIncludeSelection(event.currentTarget.checked)} />
              </div>
              <button class="btn btn-primary w-full" type="submit">設定を保存する</button>
            </fieldset>
            <p id="options-status" role="status" aria-live="polite">{status()}</p>
          </form>
          <div class="reset-section">
            <div><h3>初期設定に戻す</h3><p>テーマと選択テキストの設定を戻します。保存したメモは残ります。</p></div>
            <button class="btn btn-outline btn-sm" type="button" disabled={busy()} onClick={() => { if (!busy()) dialog.showModal(); }}>リセット</button>
          </div>
        </section>
        <aside class="card live-guide" aria-labelledby="live-title">
          <div class="card-body">
            <span class="badge badge-soft badge-primary badge-sm">LIVE PREVIEW</span>
            <h3 id="live-title">保存したら、もう反映。</h3>
            <p>別の画面で変更した設定も、ストレージの変更通知で UI に届きます。</p>
            <ol><li>表示確認用ページを開く</li><li>ここでテーマを変更して保存する</li><li>開いたページに戻り、色の変化を確認する</li></ol>
            <a href={props.variant.previewHref} target="_blank" rel="noopener" class="btn btn-soft btn-primary">表示確認用ページを開く ↗</a>
            <p class="live-guide-note">{props.variant.previewNote}</p>
          </div>
        </aside>
      </div>
      <dialog ref={dialog} class="modal" aria-labelledby="reset-title" aria-describedby="reset-help">
        <div class="modal-box">
          <h2 id="reset-title" class="text-lg font-bold">初期設定に戻しますか？</h2>
          <p id="reset-help" class="py-4 text-sm">テーマは「端末に合わせる」、選択テキストの取得は ON に戻ります。メモは削除しません。</p>
          <form method="dialog" class="modal-action">
            <button class="btn" value="cancel" autofocus>キャンセル</button>
            <button type="button" class="btn btn-primary" onClick={() => {
              if (!dialog.open || busy()) return;
              dialog.close();
              void perform(() => props.actions.reset({ confirmed: true }), "初期設定に戻しました。メモはそのまま残っています。");
            }}>初期設定に戻す</button>
          </form>
        </div>
      </dialog>
    </>
  );
}
