// Removes the bundled samples so a derived extension starts from the base only.
//   node scripts/samples.ts remove [--force]   Edit this checkout in place (refuses uncommitted changes without --force).
//   node scripts/samples.ts verify             Remove the samples from a temporary copy and run both variants' checks there.
//
// Sample code is either a whole file listed in SAMPLE_PATHS or a region between marker lines in a source,
// style, config, workflow, or Markdown file. A marker line starts with a comment token followed by
// @sample-begin or @sample-end: `// …`, `/* … */`, `{/* … */}`, `# …`, or `<!-- … -->`.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_PATHS = [
  "src/features/notes",
  "src/features/page",
  "src/features/site-access",
  "src/integrations/sampleapis",
  "src/composition/notes.ts",
  "src/composition/page.ts",
  "src/ui/screens/popup/note.tsx",
  "src/ui/screens/popup/page.tsx",
  "src/ui/screens/sidepanel/note.tsx",
  "src/ui/screens/sidepanel/page.tsx",
  "src/ui/screens/sidepanel/status.tsx",
  "tests/examples",
  "tests/e2e/samples",
  "docs/samples.md",
  "scripts/samples.ts",
];
// Permissions and hosts only the samples need. The base keeps storage (and sidePanel in that build).
const SAMPLE_PERMISSIONS = ["activeTab", "scripting", "contextMenus"];
const SAMPLE_HOSTS = ["https://api.sampleapis.com/*"];
const SAMPLE_SCRIPTS = ["test:examples", "samples:remove", "samples:verify"];
const MARKED_ROOTS = ["src", "tests", "vite.config.ts", ".github/workflows", "README.md", "docs"];
const MARKED_EXTENSIONS = /\.(?:ts|tsx|css|html|ya?ml|md)$/;
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", "release"]);
const BEGIN = /^\s*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@sample-begin\b/;
const END = /^\s*(?:\/\/|\/\*|\{\/\*|#|<!--)\s*@sample-end\b/;

function files(root: string, path: string): string[] {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) return [path];
  return readdirSync(absolute).filter((name) => !SKIPPED_DIRECTORIES.has(name)).flatMap((name) => files(root, join(path, name)));
}

function stripRegions(text: string, path: string): string {
  const kept: string[] = [];
  let open: number | undefined;
  text.split("\n").forEach((line, index) => {
    if (BEGIN.test(line)) {
      if (open !== undefined) throw new Error(`${path}:${index + 1}: nested @sample-begin (opened at line ${open + 1}).`);
      open = index;
    } else if (END.test(line)) {
      if (open === undefined) throw new Error(`${path}:${index + 1}: @sample-end without @sample-begin.`);
      open = undefined;
    } else if (open === undefined) {
      kept.push(line);
    }
  });
  if (open !== undefined) throw new Error(`${path}:${open + 1}: @sample-begin is never closed.`);
  return kept.join("\n");
}

function editJson(root: string, path: string, edit: (value: Record<string, unknown>) => void) {
  const value = JSON.parse(readFileSync(join(root, path), "utf8")) as Record<string, unknown>;
  edit(value);
  writeFileSync(join(root, path), JSON.stringify(value, null, 2) + "\n");
}

// Keeps messages that remaining code or the manifest still names; the rest belonged to the samples.
function pruneMessages(root: string) {
  const sources = [...files(root, "src"), "vite.config.ts", "public/manifest.json"]
    .filter((path) => /\.(?:ts|tsx|json)$/.test(path)).map((path) => readFileSync(join(root, path), "utf8")).join("\n");
  const locales = join(root, "public/_locales");
  let removed = 0;
  for (const locale of readdirSync(locales)) {
    editJson(root, `public/_locales/${locale}/messages.json`, (catalog) => {
      for (const key of Object.keys(catalog)) {
        if (!sources.includes(`"${key}"`) && !sources.includes(`__MSG_${key}__`)) { delete catalog[key]; removed++; }
      }
    });
  }
  return removed;
}

function remove(root: string) {
  const deleted = SAMPLE_PATHS.filter((path) => existsSync(join(root, path)));
  for (const path of deleted) rmSync(join(root, path), { recursive: true });
  for (const empty of ["src/integrations", "tests/e2e/samples"]) {
    const absolute = join(root, empty);
    if (existsSync(absolute) && readdirSync(absolute).length === 0) rmSync(absolute, { recursive: true });
  }

  const edited: string[] = [];
  for (const path of MARKED_ROOTS.flatMap((entry) => files(root, entry)).filter((path) => MARKED_EXTENSIONS.test(path))) {
    const text = readFileSync(join(root, path), "utf8");
    if (!text.split("\n").some((line) => BEGIN.test(line) || END.test(line))) continue;
    writeFileSync(join(root, path), stripRegions(text, path));
    edited.push(path);
  }

  editJson(root, "public/manifest.json", (manifest) => {
    manifest.permissions = (manifest.permissions as string[]).filter((name) => !SAMPLE_PERMISSIONS.includes(name));
    const hosts = ((manifest.host_permissions as string[] | undefined) ?? []).filter((host) => !SAMPLE_HOSTS.includes(host));
    if (hosts.length > 0) manifest.host_permissions = hosts;
    else delete manifest.host_permissions;
  });
  editJson(root, "package.json", (pkg) => {
    const scripts = pkg.scripts as Record<string, string>;
    for (const name of SAMPLE_SCRIPTS) delete scripts[name];
  });
  const messages = pruneMessages(root);

  console.log(`Removed ${deleted.length} sample paths:\n  ${deleted.join("\n  ")}`);
  console.log(`Removed sample regions from ${edited.length} files:\n  ${edited.join("\n  ")}`);
  console.log(`Removed ${messages} unused messages, sample permissions, and sample scripts.`);
}

function run(command: string, args: string[], cwd: string) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  // pnpm is a .cmd shim on Windows, which Node only starts through a shell.
  execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

const [command, ...flags] = process.argv.slice(2);
const root = fileURLToPath(new URL("..", import.meta.url));

// The files to copy for verification: git's view when available, otherwise everything but build output.
function sourceFiles(): string[] {
  try {
    return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n").filter((path) => path && existsSync(join(root, path)));
  } catch {
    return files(root, ".").map((path) => path.replace(/^\.\//, ""));
  }
}

if (command === "remove") {
  // Removal deletes files and edits sources, so it needs git to show the user's changes are safe.
  let dirty: string | undefined;
  try { dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { dirty = undefined; }
  if (!flags.includes("--force")) {
    if (dirty === undefined) {
      console.error("This folder is not a git work tree, so uncommitted changes cannot be checked. Back it up or run `git init` and commit, or pass --force.");
      process.exit(1);
    }
    if (dirty.trim()) {
      console.error("Commit or stash your changes first, or pass --force. Removal deletes files and edits sources.");
      process.exit(1);
    }
  }
  remove(root);
  console.log("\nNext: pnpm run check && pnpm run check:sidepanel. Sample passages marked in the docs are gone; review the remaining text that uses the samples as examples.");
} else if (command === "verify") {
  const copy = mkdtempSync(join(tmpdir(), "chrome-ext-base-without-samples-"));
  for (const path of sourceFiles()) {
    mkdirSync(dirname(join(copy, path)), { recursive: true });
    cpSync(join(root, path), join(copy, path));
  }
  symlinkSync(join(root, "node_modules"), join(copy, "node_modules"), "dir");
  remove(copy);
  const leftovers = MARKED_ROOTS.flatMap((entry) => files(copy, entry)).filter((path) => MARKED_EXTENSIONS.test(path))
    .filter((path) => readFileSync(join(copy, path), "utf8").split("\n").some((line) => BEGIN.test(line) || END.test(line)));
  if (leftovers.length > 0) throw new Error(`Markers remain in ${leftovers.join(", ")}.`);
  run("pnpm", ["run", "check"], copy);
  run("pnpm", ["run", "check:sidepanel"], copy);
  rmSync(copy, { recursive: true, force: true });
  console.log("\nThe base builds and passes its checks without samples.");
} else {
  console.error("Usage: node scripts/samples.ts <remove [--force] | verify>");
  process.exit(1);
}
