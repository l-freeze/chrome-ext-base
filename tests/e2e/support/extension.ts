import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
// @sample-begin
import { existsSync } from "node:fs";
// @sample-end
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { BrowserContext, Page, Worker } from "playwright";

export type Variant = "popup" | "sidepanel";

const dist = (variant: Variant) => fileURLToPath(new URL(`../../../dist/${variant}/`, import.meta.url));

export function readManifest(path: string): chrome.runtime.ManifestV3 {
  return JSON.parse(readFileSync(join(path, "manifest.json"), "utf8")) as chrome.runtime.ManifestV3;
}

export interface LoadedExtension {
  context: BrowserContext;
  worker: Worker;
  id: string;
  manifest: chrome.runtime.ManifestV3;
  // Opens an extension page in a new tab, e.g. the manifest's popup, side panel, or options page.
  open(path: string): Promise<Page>;
  close(): Promise<void>;
}

// Loads a built extension into Chromium. Headless Chromium supports extensions when the full
// browser ("chromium" channel) is used. CHROMIUM_PATH selects an existing browser binary.
export interface LaunchOptions {
  variant: Variant;
  path?: string;
  language?: string;
  // @sample-begin
  keepWelcome?: boolean;
  // @sample-end
}

export async function launchExtension(options: LaunchOptions): Promise<LoadedExtension> {
  const path = options.path ?? dist(options.variant);
  const language = options.language ?? "ja";
  const profile = mkdtempSync(join(tmpdir(), "e2e-profile-"));
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    locale: language,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [`--lang=${language}`, `--disable-extensions-except=${path}`, `--load-extension=${path}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).host;
  // @sample-begin
  // The welcome sample opens a tab on install. Close it so each test starts from the same window.
  if (existsSync(join(path, "welcome.html")) && !options.keepWelcome) await (await findPage(context, "/welcome.html")).close();
  // @sample-end
  return {
    context, worker, id, manifest: readManifest(path),
    async open(page) {
      const tab = await context.newPage();
      await tab.goto(`chrome-extension://${id}/${page}`);
      return tab;
    },
    async close() {
      await context.close();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

// Waits for a tab the extension opened itself, e.g. with tabs.create.
export async function findPage(context: BrowserContext, pathname: string, timeoutMs = 10_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const page = context.pages().find((candidate) => candidate.url().endsWith(pathname));
    if (page) { await page.waitForLoadState(); return page; }
    if (Date.now() > deadline) throw new Error(`No page ${pathname} opened within ${timeoutMs} ms.`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// The screen a variant opens from the toolbar, read from its manifest.
export function screenPath(extension: LoadedExtension): string {
  const path = extension.manifest.action?.default_popup ?? extension.manifest.side_panel?.default_path;
  if (!path) throw new Error("The manifest registers no popup or side panel.");
  return path;
}

// A copy of a built variant with extra host permissions, for flows that need a granted site
// (Chrome's permission dialog cannot be answered in headless mode). Test-only; never ship it.
export function withHostPermissions(variant: Variant, hosts: string[]): { path: string; dispose(): void } {
  const path = mkdtempSync(join(tmpdir(), `e2e-${variant}-`));
  cpSync(dist(variant), path, { recursive: true });
  const manifest = readManifest(path);
  manifest.host_permissions = [...(manifest.host_permissions ?? []), ...hosts];
  writeFileSync(join(path, "manifest.json"), JSON.stringify(manifest));
  return { path, dispose: () => rmSync(path, { recursive: true, force: true }) };
}

// Serves fixed HTML pages on localhost for content to read.
export async function serveSite(pages: Record<string, string>): Promise<{ url(path: string): string; close(): Promise<void> }> {
  const server = createServer((request, response) => {
    const body = pages[request.url ?? ""];
    response.writeHead(body === undefined ? 404 : 200, { "content-type": "text/html; charset=utf-8" });
    response.end(body ?? "");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: (path) => `http://localhost:${port}${path}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

// Opens a web page as the active tab of the extension page's window, so window-scoped views follow it.
export async function openTab(from: Page, url: string): Promise<Page> {
  const created = from.context().waitForEvent("page");
  await from.evaluate(async (target) => {
    const window = await chrome.windows.getCurrent();
    await chrome.tabs.create({ windowId: window.id!, url: target });
  }, url);
  const tab = await created;
  await tab.waitForLoadState();
  return tab;
}
