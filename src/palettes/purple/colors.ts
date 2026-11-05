import type { PaletteColors } from "../palette";

// Matches theme.css in this folder.
export const colors = {
  notice: {
    light: { text: "#25223b", background: "#ffffff", border: "#e7e2ef", accent: "#6951d7", error: "#ad334a", button: "#5a43c9" },
    dark: { text: "#eee9f8", background: "#28263b", border: "#3c3751", accent: "#b8a5ff", error: "#f3a2b1", button: "#c9bbff" },
  },
  badge: { accent: "#6951d7", positive: "#24704c", danger: "#ad334a" },
} satisfies PaletteColors;
