// Captures every page of the built extension for each palette, locale, and light/dark theme.
//   node scripts/screenshots.ts [--palettes purple,coffee] [--variants popup,sidepanel] [--locales ja,en] [--out docs/screenshots]
// Defaults: every folder in src/palettes, both variants, every locale in public/_locales, docs/screenshots.
//
// Nothing here knows the extension's features. The pages come from the built extension itself: the toolbar
// popup, the side panel, the options page, and any other HTML page at the root (e.g. a welcome page).
// The extension is loaded into Chromium, so pages run with the real extension APIs and a fresh, empty profile.
// CHROMIUM_PATH selects the browser binary, as for the E2E tests.
//
// Output: <out>/<palette>/<page>-<light|dark>-<locale>.png, where <page> is popup, sidepanel, options, or the
// HTML file's name. A page that both variants build (such as options) is taken from the first variant only.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { Page } from "playwright";
import { build } from "vite";

type Kind = "popup" | "sidepanel" | "page";
interface Target { name: string; path: string; kind: Kind }

const root = fileURLToPath(new URL("..", import.meta.url));
const folders = (dir: string) => readdirSync(resolve(root, dir), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

function option(name: string, fallback: string[]): string[] {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (index >= 0 && !value) throw new Error(`--${name} needs a comma-separated list.`);
  return value ? value.split(",").map((part) => part.trim()).filter(Boolean) : fallback;
}

const palettes = option("palettes", folders("src/palettes"));
const variants = option("variants", ["popup", "sidepanel"]);
const locales = option("locales", folders("public/_locales"));
const out = resolve(root, option("out", ["docs/screenshots"])[0]!);
for (const variant of variants) if (variant !== "popup" && variant !== "sidepanel") throw new Error(`Unknown variant "${variant}".`);

// The pages of one build, named by their role in the manifest; other root pages keep their file name.
function targets(dir: string): Target[] {
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as chrome.runtime.ManifestV3;
  const roles = new Map<string, Target>();
  const add = (path: string | undefined, name: string, kind: Kind) => { if (path && !roles.has(path)) roles.set(path, { name, path, kind }); };
  add(manifest.action?.default_popup, "popup", "popup");
  add(manifest.side_panel?.default_path, "sidepanel", "sidepanel");
  add(manifest.options_ui?.page ?? manifest.options_page, "options", "page");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".html")).sort()) add(file, file.replace(/\.html$/, ""), "page");
  return [...roles.values()];
}

// Chrome sizes a popup to its document, up to 800 x 600; a side panel is narrow and as tall as the window.
async function capture(page: Page, target: Target, file: string) {
  if (target.kind === "popup") {
    await page.setViewportSize({ width: 800, height: 600 });
    const width = await page.evaluate(() => Math.ceil(document.documentElement.getBoundingClientRect().width));
    await page.setViewportSize({ width: Math.min(800, Math.max(1, width)), height: 600 });
    const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: Math.min(800, width), height: Math.min(600, height) } });
  } else {
    await page.screenshot({ path: file, fullPage: true });
  }
}

// Waits until the page has loaded its data: no pending requests, fonts ready, and no busy or loading markers.
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"], .loading'), null, { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function shoot(dir: string, pages: Target[], palette: string, locale: string) {
  const language = locale.replace("_", "-");
  const profile = mkdtempSync(join(tmpdir(), "screenshots-profile-"));
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium", headless: true, locale: language, deviceScaleFactor: 1,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [`--lang=${language}`, `--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    for (const target of pages) for (const scheme of ["light", "dark"] as const) {
      const page = await context.newPage();
      const viewport = target.kind === "sidepanel" ? { width: 380, height: 900 } : { width: 1100, height: 900 };
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${id}/${target.path}`);
      await settle(page);
      const file = join(out, palette, `${target.name}-${scheme}-${locale}.png`);
      await capture(page, target, file);
      console.log(`  ${file.slice(root.length)}`);
      await page.close();
    }
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

for (const palette of palettes) {
  mkdirSync(join(out, palette), { recursive: true });
  const done = new Set<string>();
  for (const variant of variants) {
    const dir = mkdtempSync(join(tmpdir(), `screenshots-${palette}-${variant}-`));
    try {
      // The palette is chosen for this build only; package.json is not changed.
      process.env.EXTENSION_PALETTE = palette;
      await build({ root, mode: variant, logLevel: "warn", build: { outDir: dir, emptyOutDir: true, sourcemap: false } });
      const pages = targets(dir).filter((target) => !done.has(target.name));
      console.log(`${palette} / ${variant}: ${pages.map((target) => target.name).join(", ") || "no new pages"}`);
      for (const locale of locales) await shoot(dir, pages, palette, locale);
      for (const target of pages) done.add(target.name);
    } finally {
      delete process.env.EXTENSION_PALETTE;
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
