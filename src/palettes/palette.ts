// Colors used outside the screens' CSS: the notice injected into web pages (which cannot read the
// extension's stylesheets) and the toolbar badge. Each palette's colors.ts provides one of these.
export interface NoticeColors {
  text: string;
  background: string;
  border: string;
  accent: string;   // the stripe of a success notice, the focus ring
  error: string;    // the stripe of an error notice
  button: string;   // the notice's button text and outline
}

export interface PaletteColors {
  notice: { light: NoticeColors; dark: NoticeColors };
  badge: {
    accent: string;     // a neutral reminder
    positive: string;   // a count of new things
    danger: string;     // a failure
  };
}
