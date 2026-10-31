import { readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const output = fileURLToPath(new URL("../../dist/", import.meta.url));

// Inspect the built artifact. Names, permissions, and sample features are not fixed here.
function localFile(path: string, base = output): string {
  const absolute = resolve(base, decodeURIComponent(path.split(/[?#]/)[0]!));
  const within = relative(output, absolute);
  expect(within === ".." || within.startsWith("../") || within.startsWith("..\\"), path).toBe(false);
  expect(statSync(absolute).isFile(), path).toBe(true);
  expect(statSync(absolute).size, path).toBeGreaterThan(0);
  return absolute;
}

function htmlPage(path: string) {
  const file = localFile(path);
  const html = readFileSync(file, "utf8");
  expect(html, path).toMatch(/<html[\s>]/i);
  // Vite's emitted script and stylesheet references must resolve inside dist.
  for (const tag of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    if (tag[1]!.toLowerCase() === "link" && !/\brel=["'](?:stylesheet|modulepreload)["']/i.test(tag[0])) continue;
    const reference = /\b(?:src|href)=["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (reference) {
      expect(reference, path).not.toMatch(/^(?:[a-z][a-z\d+.-]*:|\/)/i);
      localFile(reference, dirname(file));
    }
  }
}

it("Manifest V3 と、登録された画面・スクリプト・アイコンが配布物に揃っている", () => {
  const manifest = JSON.parse(readFileSync(localFile("manifest.json"), "utf8")) as chrome.runtime.ManifestV3;
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.name.trim()).not.toBe("");
  expect(manifest.version).toMatch(/^\d+(?:\.\d+){0,3}$/);
  const pages = [manifest.action?.default_popup, manifest.options_page, manifest.options_ui?.page,
    manifest.devtools_page, manifest.side_panel?.default_path, ...Object.values(manifest.chrome_url_overrides ?? {})];
  for (const page of pages) if (page) htmlPage(page);
  if (manifest.background?.service_worker) localFile(manifest.background.service_worker);
  for (const script of manifest.content_scripts ?? []) {
    for (const path of [...script.js ?? [], ...script.css ?? []]) localFile(path);
  }
  for (const path of Object.values(manifest.icons ?? {})) localFile(path);
  const actionIcon = manifest.action?.default_icon;
  for (const path of typeof actionIcon === "string" ? [actionIcon] : Object.values(actionIcon ?? {})) localFile(path);
});
