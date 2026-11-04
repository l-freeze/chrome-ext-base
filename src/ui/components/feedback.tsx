export type FeedbackState = "idle" | "dirty" | "loading" | "success" | "error";

// Complete class names keep Tailwind's source detection reliable.
const variants: Record<FeedbackState, string> = {
  idle: "alert-info",
  dirty: "alert-warning",
  loading: "alert-info",
  success: "alert-success",
  error: "alert-error",
};

export function Feedback(props: { message: string; state: FeedbackState }) {
  return (
    <div class={`alert alert-soft feedback ${variants[props.state]}`} role="status" aria-live="polite"
      aria-atomic="true" data-state={props.state}>
      <span class={props.state === "loading" ? "loading loading-spinner loading-xs" : "feedback-dot loading-xs"}
        aria-hidden="true" data-feedback-indicator />
      <span>{props.message}</span>
    </div>
  );
}
