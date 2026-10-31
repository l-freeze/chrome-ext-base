import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [tailwindcss()],
  build: {
    target: "chrome124", sourcemap: true,
    rolldownOptions: { input: { popup: "index.html", options: "options.html" } },
  },
});
