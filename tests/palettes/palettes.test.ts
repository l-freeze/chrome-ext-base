import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { PaletteColors } from "../../src/palettes/palette";

// A build contains only the palette selected in package.json, so CI never builds the others.
// This checks every palette without building: same theme names and tokens, a full icon set, and colors.
const root = fileURLToPath(new URL("../../src/palettes/", import.meta.url));
const palettes = readdirSync(root).filter((name) => statSync(resolve(root, name)).isDirectory()).sort();
const reference = palettes.includes("purple") ? "purple" : palettes[0]!;

function theme(name: string) {
  const css = readFileSync(resolve(root, name, "theme.css"), "utf8");
  const blocks = [...css.matchAll(/@plugin\s+"daisyui\/theme"\s*\{([^}]*)\}/g)].map((match) => match[1]!);
  return blocks.map((block) => ({
    name: /\bname:\s*"([^"]+)"/.exec(block)?.[1],
    tokens: [...block.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]).sort(),
  }));
}
const icons = (name: string) => readdirSync(resolve(root, name, "icons")).sort();
const shape = (value: unknown): unknown => typeof value === "object" && value !== null
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, inner]) => [key, shape(inner)]))
  : typeof value;
const leaves = (value: unknown): unknown[] => typeof value === "object" && value !== null ? Object.values(value).flatMap(leaves) : [value];

it("配色が一つ以上あり、package.json の既定値が存在する", () => {
  expect(palettes.length).toBeGreaterThan(0);
  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8")) as { palette?: string };
  expect(palettes).toContain(pkg.palette ?? "purple");
});

it.each(palettes)("%s: テーマ名・色の項目・アイコンが基準の配色と揃っている", (name) => {
  expect(theme(name)).toEqual(theme(reference));
  expect(theme(name).map((entry) => entry.name)).toEqual(["notebook", "notebook-dark"]);
  expect(icons(name)).toEqual(icons(reference));
});

it.each(palettes)("%s: 画面の CSS の外で使う色が揃っていて、どれも #rrggbb である", async (name) => {
  const load = async (palette: string) => (await import(`../../src/palettes/${palette}/colors.ts`) as { colors: PaletteColors }).colors;
  const colors = await load(name);
  expect(shape(colors)).toEqual(shape(await load(reference)));
  for (const color of leaves(colors)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
});
