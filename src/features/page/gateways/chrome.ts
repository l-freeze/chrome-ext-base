import type { PageInfo } from "../page";
import { PageCaptureError } from "../page";
import type { PageReader } from "../ports";
import { ValidationError } from "../../../lib/validation";
import { readPage } from "../../../content/page";

export interface PageBrowser {
  query(query: { active: true; currentWindow: true }): Promise<{ id?: number | undefined; url?: string | undefined }[]>;
  executeScript(injection: chrome.scripting.ScriptInjection<[boolean], unknown>): Promise<chrome.scripting.InjectionResult<unknown>[]>;
}

function parseResponse(raw: unknown): PageInfo {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) ||
      !("title" in raw) || typeof raw.title !== "string" || raw.title.length > 512 ||
      !("url" in raw) || typeof raw.url !== "string" || raw.url.length > 8192 ||
      !("selection" in raw) || typeof raw.selection !== "string" || raw.selection.length > 2000 ||
      !("selectionTruncated" in raw) || typeof raw.selectionTruncated !== "boolean") {
    throw new ValidationError("The page script returned an unexpected result.");
  }
  if (!["http:", "https:"].includes(new URL(raw.url).protocol)) throw new PageCaptureError("unsupported-page");
  return { title: raw.title, url: raw.url, selection: raw.selection, selectionTruncated: raw.selectionTruncated };
}

export function createChromePageReader(browser: PageBrowser): PageReader {
  return {
    async read(input) {
      const [tab] = await browser.query({ active: true, currentWindow: true });
      if (!tab || typeof tab.id !== "number" || !Number.isSafeInteger(tab.id) || tab.id < 0 || !tab.url || !/^https?:\/\//.test(tab.url)) {
        throw new PageCaptureError("unsupported-page");
      }
      let results: chrome.scripting.InjectionResult<unknown>[];
      try {
        results = await browser.executeScript({ target: { tabId: tab.id }, func: readPage, args: [input.includeSelection] });
      } catch {
        throw new PageCaptureError("blocked");
      }
      const info = parseResponse(results[0]?.result);
      // Even an unexpected script response cannot expose selection when disabled.
      return input.includeSelection ? info : { ...info, selection: "", selectionTruncated: false };
    },
  };
}
