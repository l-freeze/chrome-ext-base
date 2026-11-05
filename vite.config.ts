/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// package.json is the only place to change the version; the build writes it into the manifest.
// Chrome accepts one to four dot-separated integers from 0 to 65535, so pre-release tags are rejected.
function extensionVersion(): string {
  const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version?: unknown };
  if (typeof version !== "string" || !/^\d+(?:\.\d+){0,3}$/.test(version) || version.split(".").some((part) => Number(part) > 65535)) {
    throw new Error(`package.json version "${String(version)}" is not a valid Chrome extension version (e.g. 1.2.3).`);
  }
  return version;
}

export default defineConfig(({ mode }) => {
  const sidepanel = mode === "sidepanel";
  // Verification builds go to dist/; scripts/release.ts overrides outDir and turns off source maps.
  const outDir = `dist/${sidepanel ? "sidepanel" : "popup"}`;
  let resolvedOutDir = outDir;
  return {
    base: "./",
    plugins: [solid(), tailwindcss(), {
      // The worker has no DOM. Functions it injects into pages may use the DOM, but UI modules must not be
      // reachable from it, and service workers cannot use dynamic import.
      name: "worker-boundary",
      generateBundle(_options, bundle) {
        const worker = Object.values(bundle).find((output) => output.type === "chunk" && output.isEntry && output.name === "worker");
        if (!worker || worker.type !== "chunk") return;
        const problems: string[] = [];
        const seen = new Set<string>();
        const pending = [worker.fileName];
        while (pending.length > 0) {
          const output = bundle[pending.pop()!];
          if (!output || output.type !== "chunk" || seen.has(output.fileName)) continue;
          seen.add(output.fileName);
          for (const id of output.moduleIds) if (/[\\/]src[\\/]ui[\\/]|[\\/]solid-js[\\/]/.test(id)) problems.push(id);
          if (output.dynamicImports.length > 0) problems.push(`${output.fileName} uses dynamic import`);
          pending.push(...output.imports);
        }
        if (problems.length > 0) this.error(`The service worker reaches UI code or dynamic imports:\n${problems.join("\n")}`);
      },
    }, {
      name: "extension-manifest",
      configResolved(config) { resolvedOutDir = resolve(config.root, config.build.outDir); },
      buildStart() { this.addWatchFile(resolve("public/manifest.json")); this.addWatchFile(resolve("package.json")); },
      writeBundle() {
        const manifest = { ...JSON.parse(readFileSync("public/manifest.json", "utf8")), version: extensionVersion() } as chrome.runtime.ManifestV3;
        if (sidepanel) {
          manifest.name = "__MSG_extensionNameSidepanel__";
          manifest.permissions = [...(manifest.permissions ?? []), "sidePanel"];
          // @sample-begin
          // Page capture follows the panel window's active tab with per-site permissions. activeTab stays for
          // the context menu and shortcut, which act on the tab where the user invoked them.
          manifest.permissions = [...manifest.permissions, "tabs"];
          manifest.optional_host_permissions = ["http://*/*", "https://*/*"];
          // @sample-end
          // Keep the toolbar icon; the side panel replaces only the popup and the title.
          const { default_popup: _popup, ...action } = manifest.action ?? {};
          manifest.action = { ...action, default_title: "__MSG_actionTitleSidepanel__" };
          manifest.side_panel = { default_path: "sidepanel.html" };
          manifest.options_ui = { page: "sidepanel-options.html", open_in_tab: true };
        }
        writeFileSync(resolve(resolvedOutDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
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
