export type FeedbackState = "idle" | "dirty" | "loading" | "success" | "error";

const variants: Record<FeedbackState, string> = {
  idle: "alert-info",
  dirty: "alert-warning",
  loading: "alert-info",
  success: "alert-success",
  error: "alert-error",
};

export function createFeedback(element: HTMLElement) {
  const text = element.querySelector<HTMLElement>("[data-feedback-text]")!;
  const indicator = element.querySelector<HTMLElement>("[data-feedback-indicator]")!;

  return {
    show(message: string, state: FeedbackState = "idle") {
      element.classList.remove(...Object.values(variants));
      element.classList.add(variants[state]);
      element.dataset.state = state;
      text.textContent = message;
      indicator.classList.toggle("loading", state === "loading");
      indicator.classList.toggle("loading-spinner", state === "loading");
      indicator.classList.toggle("feedback-dot", state !== "loading");
    },
  };
}
