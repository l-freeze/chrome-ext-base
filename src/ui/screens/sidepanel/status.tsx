import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

export interface Message { key: MessageKey; error: boolean }
export const message = (key: MessageKey, error = false): Message => ({ key, error });

export function Status(props: { value: Message }) {
  const { t } = useI18n();
  return <p class="panel-description" role="status" aria-live="polite" data-error={String(props.value.error)}>{t(props.value.key)}</p>;
}
