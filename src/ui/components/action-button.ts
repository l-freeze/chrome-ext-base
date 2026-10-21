export function createActionButton(element: HTMLButtonElement) {
  const spinner = element.querySelector<HTMLElement>("[data-button-spinner]")!;
  const icon = element.querySelector<SVGElement>("[data-button-icon]")!;

  return {
    update(options: { disabled: boolean; loading: boolean }) {
      element.disabled = options.disabled;
      element.setAttribute("aria-busy", String(options.loading));
      spinner.classList.toggle("hidden", !options.loading);
      icon.classList.toggle("hidden", options.loading);
    },
  };
}
