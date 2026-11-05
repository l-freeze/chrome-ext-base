import type { PaletteColors } from "../palette";

// Matches theme.css in this folder.
export const colors = {
  notice: {
    light: { text: "#2b211b", background: "#fffdfb", border: "#e9ded4", accent: "#7b4a2b", error: "#ad334a", button: "#6e3f22" },
    dark: { text: "#f2e8df", background: "#2b231f", border: "#40352e", accent: "#e0b48c", error: "#f3a2b1", button: "#ecc6a2" },
  },
  badge: { accent: "#7b4a2b", positive: "#2f6b3f", danger: "#ad334a" },
} satisfies PaletteColors;
