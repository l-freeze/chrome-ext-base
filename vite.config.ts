/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const sidepanel = mode === "sidepanel";
  const outDir = `dist/${sidepanel ? "sidepanel" : "popup"}`;
  return {
    base: "./",
    plugins: [solid(), tailwindcss(), {
      name: "extension-manifest",
      buildStart() { this.addWatchFile(resolve("public/manifest.json")); },
      writeBundle() {
        const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8")) as chrome.runtime.ManifestV3;
        if (sidepanel) {
          manifest.name += " — Side Panel";
          manifest.permissions = [...(manifest.permissions ?? []).filter((name) => name !== "activeTab"), "sidePanel", "tabs"];
          manifest.optional_host_permissions = ["http://*/*", "https://*/*"];
          manifest.action = { default_title: "Quick Note をサイドパネルで開く" };
          manifest.side_panel = { default_path: "sidepanel.html" };
          manifest.options_ui = { page: "sidepanel-options.html", open_in_tab: true };
        }
        writeFileSync(resolve(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
      },
    }],
    // The Solid plugin selects jsdom unless an environment is set; the base tests are DOM-independent.
    test: { environment: "node" },
    build: {
      outDir,
      target: "chrome124", sourcemap: true,
      rolldownOptions: {
        input: sidepanel
          ? { sidepanel: "sidepanel.html", options: "sidepanel-options.html", worker: "src/background/sidepanel.ts" }
          : { popup: "index.html", options: "options.html", worker: "src/background/popup.ts" },
        output: { entryFileNames: (chunk) => chunk.name === "worker" ? "worker.js" : "assets/[name]-[hash].js" },
      },
    },
  };
});
