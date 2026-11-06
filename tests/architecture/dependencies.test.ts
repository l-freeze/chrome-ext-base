// The dependency rules written in docs/architecture.md and AGENTS.md, checked on every file under src.
// Only those rules are here; a derived project that changes its architecture changes the docs and this file.
// Each failure names the file, the import, the rule, and where the code usually belongs instead.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const src = fileURLToPath(new URL("../../src/", import.meta.url));
const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(?:ts|tsx)$/.test(name) ? [path] : [];
});
const sources = files(src).map((path) => ({ path: relative(src, path).split(sep).join("/"), code: readFileSync(path, "utf8") }));

// Comments may mention any module or API; only code counts.
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// Imports as paths relative to src ("features/notes/ports"), or the package name ("solid-js/web").
function imports(file: { path: string; code: string }): string[] {
  const specifiers = [...code(file.code).matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)].map((match) => match[1]!);
  return specifiers.map((specifier) => specifier.startsWith(".")
    ? relative(src, resolve(src, dirname(file.path), specifier)).split(sep).join("/")
    : specifier);
}

// Where a file sits in a feature: the model and ports, a use-case, a controller, a gateway, or compose.ts.
function featureRole(path: string): "model" | "use-case" | "controller" | "gateway" | "compose" | undefined {
  const match = /^features\/[^/]+\/(?:(use-cases|controllers|gateways)\/)?[^/]+$/.exec(path);
  if (!match) return undefined;
  if (match[1] === "use-cases") return "use-case";
  if (match[1] === "controllers") return "controller";
  if (match[1] === "gateways") return "gateway";
  return path.endsWith("/compose.ts") ? "compose" : "model";
}
const inFeature = (target: string, part: string) => new RegExp(`^features/[^/]+/${part}/`).test(target);
const under = (target: string, dir: string) => target === dir || target.startsWith(`${dir}/`);

interface Rule {
  name: string;
  source: string;   // where the rule is written
  hint: string;     // where the code usually belongs instead
  applies(path: string): boolean;
  forbidden(target: string): boolean;
}

const rules: Rule[] = [
  {
    name: "features のモデルと ports は、controller・gateway・integrations・infrastructure・ui に依存しない",
    source: "docs/architecture.md「依存方向と明示的 DI」、AGENTS.md",
    hint: "必要な機能は ports.ts に口（interface）として書き、実装を gateway に置いて composition で渡します。",
    applies: (path) => featureRole(path) === "model",
    forbidden: (target) => inFeature(target, "controllers") || inFeature(target, "gateways") ||
      ["integrations", "infrastructure", "ui"].some((dir) => under(target, dir)),
  },
  {
    name: "UseCase はモデルと port だけを参照し、controller・gateway・integrations・infrastructure・ui に依存しない",
    source: "docs/architecture.md「依存方向と明示的 DI」、AGENTS.md",
    hint: "外部とのやり取りは ports.ts の口を通し、具体的な実装は gateway に置きます。",
    applies: (path) => featureRole(path) === "use-case",
    forbidden: (target) => inFeature(target, "controllers") || inFeature(target, "gateways") ||
      ["integrations", "infrastructure", "ui"].some((dir) => under(target, dir)),
  },
  {
    name: "gateway は controller を参照しない",
    source: "docs/architecture.md「依存方向と明示的 DI」",
    hint: "入力の検証は controller、外部の形式の検証は gateway が、それぞれ自分で持ちます。",
    applies: (path) => featureRole(path) === "gateway",
    forbidden: (target) => inFeature(target, "controllers"),
  },
  {
    name: "integrations は機能を知らない",
    source: "docs/architecture.md「依存方向と明示的 DI」、AGENTS.md（Generic modules must not import features）",
    hint: "機能の形への変換は、その機能の gateway に置きます。",
    applies: (path) => under(path, "integrations"),
    forbidden: (target) => under(target, "features"),
  },
  {
    name: "infrastructure は機能と外部サービスを知らない",
    source: "docs/architecture.md「依存方向と明示的 DI」、AGENTS.md",
    hint: "機能に固有の処理は features、外部サービスの client は integrations に置き、infrastructure は汎用の仕組みだけにします。",
    applies: (path) => under(path, "infrastructure"),
    forbidden: (target) => under(target, "features") || under(target, "integrations"),
  },
  {
    name: "lib は機能に依存しない",
    source: "AGENTS.md（Generic modules must not import features）",
    hint: "lib は検証の仕組みだけです。機能の条件は各 controller・モデルに置きます。",
    applies: (path) => under(path, "lib"),
    forbidden: (target) => under(target, "features"),
  },
  {
    name: "UI は UseCase・controller・gateway を直接使わない",
    source: "docs/architecture.md「依存方向と明示的 DI」、AGENTS.md（UI screens depend on public ports）",
    hint: "画面は ports.ts の操作を props で受け取り、composition が組み立てたものを起動点が渡します。",
    applies: (path) => under(path, "ui"),
    forbidden: (target) => ["use-cases", "controllers", "gateways"].some((part) => inFeature(target, part)) || /^features\/[^/]+\/compose$/.test(target),
  },
  {
    name: "UI は storage driver を直接扱わない",
    source: "docs/architecture.md「設定とページ取得の境界」",
    hint: "保存は機能の操作（port）を通します。",
    applies: (path) => under(path, "ui"),
    forbidden: (target) => under(target, "infrastructure/storage"),
  },
  {
    name: "Solid は src/ui の中だけで使う",
    source: "docs/ui.md、AGENTS.md（Keep Solid inside src/ui）",
    hint: "features・composition・infrastructure はフレームワークに依存しない関数のままにし、画面の部品を src/ui に置きます。",
    applies: (path) => !under(path, "ui"),
    forbidden: (target) => target === "solid-js" || target.startsWith("solid-js/"),
  },
];

it("ドキュメントにある依存の規則を、src の全ファイルが守っている", () => {
  const violations: string[] = [];
  for (const file of sources) {
    for (const target of imports(file)) {
      for (const rule of rules) {
        if (rule.applies(file.path) && rule.forbidden(target)) {
          violations.push(`src/${file.path} → ${target}\n  規則: ${rule.name}（${rule.source}）\n  直し方: ${rule.hint}`);
        }
      }
    }
  }
  expect(violations, `\n${violations.join("\n\n")}\n`).toEqual([]);
});

it("UI は Chrome API を直接扱わない", () => {
  // Documented in docs/architecture.md「設定とページ取得の境界」. Chrome APIs belong in gateways and composition.
  const violations = sources.filter((file) => file.path.startsWith("ui/") && /\bchrome\s*\??\.\s*[a-zA-Z]/.test(code(file.code)))
    .map((file) => `src/${file.path}: Chrome API は gateway か composition で使い、画面には結果を port や値で渡します。`);
  expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
});

it("規則の対象になるファイルがある（パスの読み取りが壊れていないこと）", () => {
  expect(sources.some((file) => featureRole(file.path) === "use-case")).toBe(true);
  expect(sources.some((file) => file.path.startsWith("ui/"))).toBe(true);
  expect(sources.flatMap(imports).some((target) => target.startsWith("features/"))).toBe(true);
});
