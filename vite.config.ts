/// <reference types="vitest/config" />
import { build, defineConfig } from "vite";
import type { Plugin, Rolldown } from "vite";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

// package.json is the only place to change the version; the build writes it into the manifest.
// Chrome accepts one to four dot-separated integers from 0 to 65535, so pre-release tags are rejected.
function extensionVersion(): string {
  const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version?: unknown };
  if (typeof version !== "string" || !/^\d+(?:\.\d+){0,3}$/.test(version) || version.split(".").some((part) => Number(part) > 65535)) {
    throw new Error(`package.json version "${String(version)}" is not a valid Chrome extension version (e.g. 1.2.3).`);
  }
  return version;
}

// Modules that need a DOM document or a page of their own. The worker has no DOM, and content scripts run
// inside web pages, so neither may reach them. Service workers also cannot use dynamic import.
const UI_MODULE = /[\\/]src[\\/]ui[\\/]|[\\/]solid-js[\\/]/;

function boundaryProblems(bundle: Rolldown.OutputBundle, entry: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const output = bundle[pending.pop()!];
    if (!output || output.type !== "chunk" || seen.has(output.fileName)) continue;
    seen.add(output.fileName);
    for (const id of output.moduleIds) if (UI_MODULE.test(id)) problems.push(id);
    if (output.dynamicImports.length > 0) problems.push(`${output.fileName} uses dynamic import`);
    pending.push(...output.imports);
  }
  return problems;
}

// Content scripts injected with executeScript({ files }) run as classic scripts, not modules, so each
// file in src/content is bundled on its own into content/<name>.js with everything it imports.
function contentEntries(root: string): string[] {
  const dir = resolve(root, "src/content");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => /^[\w-]+\.ts$/.test(name)).map((name) => resolve(dir, name));
}

function contentScripts(): Plugin {
  let root = "";
  let outDir = "";
  let sourcemap: boolean | "inline" | "hidden" = false;
  return {
    name: "content-scripts",
    apply: "build",
    configResolved(config) { root = config.root; outDir = resolve(root, config.build.outDir); sourcemap = config.build.sourcemap; },
    buildStart() { for (const entry of contentEntries(root)) this.addWatchFile(entry); },
    async closeBundle() {
      for (const entry of contentEntries(root)) {
        const name = basename(entry, ".ts");
        await build({
          root, configFile: false, logLevel: "warn", publicDir: false,
          plugins: [{
            name: "content-boundary",
            generateBundle(_options, bundle) {
              const problems = Object.values(bundle).flatMap((output) => output.type === "chunk" && output.isEntry ? boundaryProblems(bundle, output.fileName) : []);
              if (problems.length > 0) this.error(`Content script ${name} reaches UI code or dynamic imports:\n${problems.join("\n")}`);
            },
          }],
          build: {
            outDir, emptyOutDir: false, sourcemap, target: "chrome124",
            lib: { entry, formats: ["iife"], name: "contentScript", fileName: () => `content/${name}.js` },
          },
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const sidepanel = mode === "sidepanel";
  // Verification builds go to dist/; scripts/release.ts overrides outDir and turns off source maps.
  const outDir = `dist/${sidepanel ? "sidepanel" : "popup"}`;
  let resolvedOutDir = outDir;
  return {
    base: "./",
    plugins: [solid(), tailwindcss(), contentScripts(), {
      // Functions the worker injects into pages may use the DOM; UI modules must not be reachable from it.
      name: "worker-boundary",
      generateBundle(_options, bundle) {
        const worker = Object.values(bundle).find((output) => output.type === "chunk" && output.isEntry && output.name === "worker");
        if (!worker) return;
        const problems = boundaryProblems(bundle, worker.fileName);
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
        input: {
          ...(sidepanel
            ? { sidepanel: "sidepanel.html", options: "sidepanel-options.html", worker: "src/background/sidepanel.ts" }
            : { popup: "index.html", options: "options.html", worker: "src/background/popup.ts" }),
        },
        output: { entryFileNames: (chunk) => chunk.name === "worker" ? "worker.js" : "assets/[name]-[hash].js" },
      },
    },
  };
});
