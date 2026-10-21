import template from "./extension-shell.html?raw";

export function mountExtensionShell(root: HTMLElement): HTMLElement {
  // ビルドに同梱した固定テンプレートのみ。外部データは HTML に埋め込まない。
  root.innerHTML = template;
  return root.querySelector<HTMLElement>("[data-slot=content]")!;
}
