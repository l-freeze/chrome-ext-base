import { ValidationError } from "../../lib/validation";

export type SiteAccess =
  | { available: false; reason: string }
  | { available: true; tabId: number; url: string; origin: string; allowed: boolean };

export function siteOrigin(raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError("サイトの形式が不正です。");
  let url: URL;
  try { url = new URL(raw); } catch { throw new ValidationError("サイトの形式が不正です。"); }
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== raw) {
    throw new ValidationError("HTTP(S) のサイトを指定してください。");
  }
  return url.origin;
}
