// Builds a release package of one variant: no source maps, a separate output folder, the artifact
// checks, and a ZIP to upload to the Chrome Web Store.
//   node scripts/release.ts <popup | sidepanel>
// Verification builds (`pnpm run build`) keep source maps in dist/ for debugging and are not for release.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";
import { build } from "vite";

const variant = process.argv[2];
if (variant !== "popup" && variant !== "sidepanel") {
  console.error("Usage: node scripts/release.ts <popup | sidepanel>");
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string; version: string };
const releaseDir = join(root, "release");
const outDir = join(releaseDir, variant);
const archive = join(releaseDir, `${pkg.name}-${variant}-${pkg.version}.zip`);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// A minimal ZIP writer (deflate, UTF-8 names). A fixed timestamp keeps the archive reproducible.
function writeZip(target: string, sourceDir: string) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const entries = files(sourceDir).map((path) => relative(sourceDir, path).split("\\").join("/")).sort();
  for (const name of entries) {
    const data = readFileSync(join(sourceDir, name));
    const compressed = deflateRawSync(data, { level: 9 });
    const nameBytes = Buffer.from(name, "utf8");
    const checksum = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);           // version needed
    header.writeUInt16LE(0x0800, 6);       // UTF-8 names
    header.writeUInt16LE(8, 8);            // deflate
    header.writeUInt16LE(0, 10);           // time 00:00
    header.writeUInt16LE(0x21, 12);        // date 1980-01-01
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    local.push(header, nameBytes, compressed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(0x21, 14);
    entry.writeUInt32LE(checksum, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    offset += header.length + nameBytes.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(target, Buffer.concat([...local, directory, end]));
  return entries.length;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });
await build({ root, mode: variant, logLevel: "warn", build: { outDir, emptyOutDir: true, sourcemap: false } });

const leaked = files(outDir).filter((path) => path.endsWith(".map") || /sourceMappingURL=/.test(readFileSync(path, "utf8")));
if (leaked.length > 0) throw new Error(`Release build contains source maps: ${leaked.map((path) => relative(root, path)).join(", ")}`);

execFileSync(process.execPath, [join(root, "node_modules/vitest/vitest.mjs"), "run", "tests/extension", "--mode", variant], {
  cwd: root, stdio: "inherit", env: { ...process.env, EXTENSION_DIR: outDir },
});

if (existsSync(archive)) rmSync(archive);
const count = writeZip(archive, outDir);
console.log(`\nRelease ${pkg.version} (${variant}): ${relative(root, archive)} with ${count} files, no source maps.`);
