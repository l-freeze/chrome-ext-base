import { Show } from "solid-js";
import type { JSX } from "solid-js";

// Disabled, spinner, and aria-busy follow the caller's state.
export function ActionButton(props: {
  type: "button" | "submit";
  class: string;
  disabled: boolean;
  loading: boolean;
  icon: JSX.Element;
  iconPosition?: "start" | "end";
  describedBy?: string;
  onClick?: () => void;
  children: JSX.Element;
}) {
  const end = () => props.iconPosition === "end";
  return (
    <button type={props.type} class={props.class} disabled={props.disabled} aria-busy={props.loading}
      aria-describedby={props.describedBy} onClick={() => props.onClick?.()}>
      <Show when={props.loading}><span class="loading loading-spinner loading-xs" aria-hidden="true" /></Show>
      <Show when={!props.loading && !end()}>{props.icon}</Show>
      {props.children}
      <Show when={!props.loading && end()}>{props.icon}</Show>
    </button>
  );
}
