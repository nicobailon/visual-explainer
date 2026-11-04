import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The template and the example carry a copy of the kit's SVG defs so they open as files; the renderer uses kit/defs.svg.
// Fails when a copy drifts, or when a page that links the kit also carries a copy of the kit's stylesheet.
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const defs = read("plugins/visual-explainer/kit/defs.svg").trim();
const kitRules = new Set(read("plugins/visual-explainer/kit/kit.css").split("\n").map((l) => l.trim()).filter((l) => l.includes("{") && l.length > 30));
const pages = ["plugins/visual-explainer/templates/page.html", "examples/replay-job-queue.html"];

const problems = [];
for (const path of pages) {
  const page = read(path);
  const copy = page.match(/<svg width="0" height="0"[\s\S]*?<\/svg>/)?.[0].trim();
  if (copy !== defs) problems.push(`${path}: its shared <svg><defs> block differs from kit/defs.svg`);
  if (!/<link\b[^>]*\bdata-ve-kit\b/.test(page)) problems.push(`${path}: no <link rel="stylesheet" data-ve-kit>`);
  const copied = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)].flatMap((m) => m[1].split("\n")).map((l) => l.trim()).filter((l) => kitRules.has(l));
  if (copied.length) problems.push(`${path}: ${copied.length} rule(s) copied from kit/kit.css, for example: ${copied[0]}`);
}

// A Pi compiled with Bun reports argv[1] as "/$bunfs/root/pi", which is no real file; the extension imports the kit, so the import must not throw.
const load = spawnSync(process.execPath, ["--input-type=module", "-e", "process.argv[1] = '/$bunfs/root/pi'; await import(process.env.KIT);"], { env: { ...process.env, KIT: new URL("plugins/visual-explainer/kit/render.mjs", root).href }, encoding: "utf8" });
if (load.status !== 0) problems.push(`kit/render.mjs throws on import when argv[1] is not a real file: ${load.stderr.trim().split("\n").find((l) => l.includes("Error")) ?? load.stderr.trim()}`);

if (problems.length) {
  console.error(`Kit check failed:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Kit check passed: ${pages.length} pages`);
