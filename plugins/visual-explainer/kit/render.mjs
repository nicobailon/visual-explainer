#!/usr/bin/env node
// Turns a page source into one self-contained page. A page that links the kit (<link rel="stylesheet" data-ve-kit>)
// gets the kit's CSS, fonts, SVG defs, and script inlined at that marker; a plan source goes to plan/render.mjs.
// Only the marker elements change, so a rendered page renders to itself. No installed dependencies (Pele is vendored), so it runs
// from a copied skill folder.
import { lstatSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decode, esc, find, hasClass, inner, kids, parseHtml, serialize, textOf, words } from "./html.mjs";
import { expandFlow } from "./flow.mjs";
import { plural } from "./machine.mjs";
import { expandAsk } from "./ask.mjs";
import { TAGS } from "./tags.mjs";
import { PeleError, render as drawMermaid } from "./vendor/pele.mjs";
import { hasPlan, renderPlan, renderPlanForHost } from "../plan/render.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// Each register's families, at the weights the kit uses.
const FONTS = {
  instrument: "family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600",
  blueprint: "family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600",
  paper: "family=Newsreader:opsz,wght@6..72,400..600&family=Atkinson+Hyperlegible+Next:wght@400;600&family=Atkinson+Hyperlegible+Mono:wght@400;500;600",
  editorial: "family=Instrument+Serif&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600",
};

/** Figures, figures without a caption, expanded tags and flows, prose words outside figures, and a line per walked machine. */
function count(doc, tags) {
  const r = { figures: 0, uncaptioned: 0, dataTags: tags.filter((t) => t.name !== "ve-flow").length, flows: tags.filter((t) => t.name === "ve-flow").length, proseWords: 0 };
  const machines = tags.filter((t) => t.machine).map((t) => t.machine.line);
  if (machines.length) r.machines = machines;
  // a <p> inside an <li> is counted once, with its <li>
  const visit = (n, quiet) => {
    for (const c of kids(n)) {
      if (c.name === "figure") { r.figures++; if (!kids(c).some((k) => k.name === "figcaption")) r.uncaptioned++; }
      const prose = !quiet && (c.name === "p" || c.name === "li");
      if (prose) r.proseWords += words(textOf(c));
      visit(c, quiet || prose || c.name === "figure");
    }
  };
  visit(doc, false);
  return r;
}

export const reportPage = (html) => count(parseHtml(html), []);

export const reportLine = (r) => `Page: ${plural(r.figures, "figure")}${r.uncaptioned ? ` (${r.uncaptioned} without a caption)` : ""}${r.dataTags ? ` · ${plural(r.dataTags, "data tag")}` : ""}${r.flows ? ` · ${plural(r.flows, "flow")}` : ""} · ${plural(r.proseWords, "prose word")} outside figures${(r.machines ?? []).map((m) => `\n${m}`).join("")}`;

/**
 * Inlines the kit at its marker and expands the data tags, <ve-flow>, and <ve-ask>. A page with none returns unchanged, with `kit: false`.
 * `sendBack` marks a page Pi opens in Glimpse, so the reader's reply goes to the agent instead of being copied.
 * `root` is the repo a <ve-flow> model imports from; `models: false` refuses to run one (the MCP server, unless opted in).
 */
export function renderPage(source, { sendBack = false, root = process.cwd(), models = true } = {}) {
  const errors = [], warnings = [];
  const doc = parseHtml(source);
  const links = find(doc, (n) => n.name === "link" && "data-ve-kit" in n.attrs);
  const tags = find(doc, (n) => Object.hasOwn(TAGS, n.name) || n.name === "ve-flow" || n.name === "ve-ask");
  const asks = tags.filter((t) => t.name === "ve-ask"), charts = tags.filter((t) => t.name !== "ve-ask");
  // Mermaid is drawn on kit pages only; a deck or another page without the kit keeps its <pre> as written
  const mermaids = links.length ? find(doc, (n) => n.name === "pre" && hasClass(n, "mermaid")) : [];
  if (!links.length && !tags.length && !mermaids.length) return { html: source, kit: false, errors, warnings, report: count(doc, charts) };
  const lineOf = (pos) => source.slice(0, pos).split("\n").length;
  const where = (n) => `line ${lineOf(n.pos)} <${n.name}${n.attrs.id ? `#${n.attrs.id}` : ""}>`;
  if (!links.length) errors.push(`${where(tags[0])}: tags need the kit; add <link rel="stylesheet" href="kit.css" data-ve-kit> to <head>`);
  if (links.length > 1) errors.push(`${links.length} <link data-ve-kit> elements; keep one in <head>`);
  const register = find(doc, (n) => n.name === "html")[0]?.attrs["data-register"] || "instrument";
  if (!FONTS[register]) errors.push(`data-register="${register}" is not a register; use ${Object.keys(FONTS).join(", ")}`);
  const body = find(doc, (n) => n.name === "body")[0];
  if (!body) errors.push("the page has no <body>");
  // a box or arrow keeps the data-ref and data-s it was written with, so it lights with its terms and its steps
  const ref = (k) => {
    if ("claim" in k.attrs) errors.push(`${where(k)}: claim= belongs to plan pages; link a part to its terms with data-ref`);
    return ["data-ref", "data-s"].filter((a) => k.attrs[a] !== undefined).map((a) => ` ${a}="${esc(k.attrs[a])}"`).join("");
  };
  for (const n of find(doc, (x) => "data-if" in x.attrs)) errors.push(`${where(n)}: data-if belongs to plan pages`);
  // the reader's reply is collected inside <main>, so an ask anywhere else would be answered and never reach the agent
  if (asks.length) {
    const main = find(doc, (n) => n.name === "main")[0];
    const inMain = new Set(main ? find(main, (n) => n.name === "ve-ask") : []);
    for (const a of asks) if (!inMain.has(a)) errors.push(`${where(a)}: <ve-ask> must be inside <main>, where the reader's reply is collected`);
  }
  const ids = new Map();
  for (const t of tags) {
    if (t.name === "ve-ask") t.html = expandAsk(t, { errors, warnings, where, ids, k: asks.indexOf(t) + 1, total: asks.length, page: true });
    else t.html = t.name === "ve-flow" ? expandFlow(t, { errors, warnings, where, ref, page: true, root, models }) : TAGS[t.name](t, { errors, warnings, where });
  }
  // A walked flow replays its walk: the figure's captions must match its steps, or the render writes them (and the player).
  const replayed = new Set();
  for (const t of tags.filter((x) => x.machine?.steps)) {
    const fig = find(doc, (f) => f.name === "figure" && hasClass(f, "ve-steps") && find(f, (x) => x === t).length).at(-1);
    if (!fig) continue;
    // one stepper steps through every caption in its figure, so two walks there would play as one
    if (replayed.has(fig)) { errors.push(`${where(t)}: one walked <ve-flow> per <figure class="ve-steps">; put this one in its own figure`); continue; }
    replayed.add(fig);
    const { steps } = t.machine;
    const player = find(fig, (x) => hasClass(x, "ve-player"))[0], ol = find(fig, (x) => hasClass(x, "ve-cap"))[0];
    const caps = ol ? find(ol, (x) => x.name === "li") : [];
    const lis = steps.map((s, i) => `<li data-n="${i + 1}/${steps.length}">${esc(s)}</li>`).join("");
    if (caps.length && caps.length !== steps.length) errors.push(`${where(caps[0])}: the walk replays in ${plural(steps.length, "step")} (${steps.map((s) => `“${s}”`).join(", ")}); write ${steps.length} captions, or none and the render writes them`);
    else if (caps.length) continue;
    else if (ol) ol.html = `<ol class="ve-cap">${lis}</ol>`;
    else if (player) player.children.unshift({ html: `<ol class="ve-cap">${lis}</ol>` });
    else t.html += `<div class="ve-player"><ol class="ve-cap">${lis}</ol><button data-go="-1" aria-label="Previous step">‹</button><button data-play>Play</button><input type="range" aria-label="Step"><button data-go="1" aria-label="Next step">›</button></div>`;
  }
  // Mermaid becomes plain SVG here, so the page draws offline, follows the theme through CSS, and is checked like any drawing.
  // A phone gets its own layout when Pele can make one narrower. Neither layout shrinks below its natural width (the frame
  // scrolls instead), and Pele draws some labels smaller than its base size, so the base grows until the smallest is 12 px.
  // a <ve-flow auto> becomes a diagram like one written in Mermaid, so it is drawn and checked the same way
  for (const t of tags.filter((x) => x.auto)) mermaids.push({ name: "ve-flow", attrs: { "aria-label": t.attrs.label }, pos: t.pos, children: [{ text: t.auto.mermaid }], flow: t });
  for (const [i, pre] of mermaids.entries()) {
    const label = pre.attrs["aria-label"];
    if (!label) { errors.push(`${where(pre)}: add aria-label="…" saying what the diagram shows`); continue; }
    let wide, narrow;
    try {
      const text = decode(inner(pre));
      const draw = (maxWidth, idPrefix) => {
        for (let fontSize = 14; ; fontSize++) {
          const r = drawMermaid(text, { fontSize, maxWidth, idPrefix });
          if (fontSize >= 24 || Math.min(...[...r.svg.matchAll(/font-size(?:="|:\s*)([\d.]+)/g)].map((m) => +m[1])) >= 12) return r;
        }
      };
      wide = draw(960, `ve-m${i}w`);
      narrow = draw(280, `ve-m${i}n`);
    } catch (e) {
      if (!(e instanceof PeleError)) throw e;
      errors.push(`${where(pre)}: Mermaid: ${e.message.replace(/\s*\n\s*/g, " ")}`);
      continue;
    }
    const both = narrow.width < wide.width;
    // Mermaid cannot put a class on a transition, so a walk's bug-path arrows are marked by the number Pele gives them
    const lit = new Set(pre.flow?.auto.bugEdges.map((k) => `edge${k}`));
    const svg = (r, cls) => r.svg.replace(' role="graphics-document document"', ` role="img" aria-label="${esc(label)}"`).replace('class="pele ', `class="pele${cls} `).replace('style="', `style="min-width:${r.width}px;`)
      .replace(/class="pele-edge pele-transition" data-id="(edge\d+)"/g, (m, id) => (lit.has(id) ? m.replace("pele-transition", "pele-transition bug-path") : m));
    pre.html = `<div class="ve-mermaid"${pre.attrs.id ? ` id="${esc(pre.attrs.id)}"` : ""}>${svg(wide, both ? " is-wide" : "")}${both ? svg(narrow, " is-narrow") : ""}</div>`;
    if (pre.flow) pre.flow.html = `<div class="frame">${pre.html}</div>${pre.flow.auto.proof}`;
  }
  // Each drawing says what it shows, and a viewBox wider than 816 gets the min-width that keeps 14-unit labels at 12 px.
  const drawings = [];
  const top = (n) => { for (const c of kids(n)) if (c.name === "svg") drawings.push(c); else top(c); };
  top(doc);
  for (const svg of drawings) {
    if (svg.attrs["aria-hidden"] === "true") continue;
    if (!("aria-label" in svg.attrs) && !("aria-labelledby" in svg.attrs) && !kids(svg).some((k) => k.name === "title")) errors.push(`${where(svg)}: add aria-label="…" saying what the drawing shows (aria-hidden="true" if it is decoration)`);
    if (!("role" in svg.attrs)) svg.openRaw = svg.openRaw.replace(/\s*(\/?)>$/, ' role="img"$1>');
    const min = Math.ceil(((+(svg.attrs.viewbox ?? "").trim().split(/[\s,]+/)[2]) || 0) * 12 / 14);
    if (!hasClass(svg, "ve-svg") || hasClass(svg, "ve-flow") || min <= 700 || /min-width|--ve-min/.test(svg.attrs.style ?? "")) continue;
    const style = svg.openRaw.match(/\sstyle\s*=\s*(["'])(.*?)\1/is);
    if (!style && svg.attrs.style !== undefined) continue;
    svg.openRaw = style ? svg.openRaw.replace(style[0], ` style=${style[1]}${style[2].replace(/;?\s*$/, "")}; --ve-min: ${min}px${style[1]}`) : svg.openRaw.replace(/\s*(\/?)>$/, ` style="--ve-min: ${min}px"$1>`);
  }
  if (errors.length) return { html: source, kit: true, errors, warnings };

  // a page with <ve-ask> also gets its styles and its part of the reply; a page with Mermaid gets the diagram colors
  const css = ["kit.css", ...(asks.length ? ["ask.css"] : []), ...(mermaids.length ? ["mermaid.css"] : [])].map((f) => readFileSync(join(here, f), "utf8")).join("");
  const js = ["reply.js", ...(asks.length ? ["ask.js"] : []), "kit.js"].map((f) => readFileSync(join(here, f), "utf8")).join("\n").replace(/<\/script/gi, "<\\/script");
  const script = `<script data-ve-kit${sendBack ? " data-send-back" : ""}>\n${js}</script>`;
  // without a charset, Firefox and Safari garble · and — (prepareRenderedHtml adds the viewport)
  const charset = find(doc, (n) => n.name === "meta" && ("charset" in n.attrs || /^content-type$/i.test(n.attrs["http-equiv"] ?? ""))).length ? "" : '<meta charset="utf-8">\n';
  links[0].html = `${charset}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${esc(FONTS[register])}&amp;display=swap" rel="stylesheet">
<style data-ve-kit>
${css}</style>`;
  // The shared defs go first in <body>, each only if the page has no element with its id (the template has all four, so it opens raw).
  const defs = readFileSync(join(here, "defs.svg"), "utf8").trimEnd().split("\n").filter((line) => {
    const id = line.match(/^\s*<\w+ id="([^"]+)"/)?.[1];
    return !id || !find(doc, (n) => n.attrs.id === id).length;
  });
  if (defs.length > 4) body.children.unshift({ html: `\n${defs.join("\n")}` });
  const scripts = find(doc, (n) => n.name === "script" && "data-ve-kit" in n.attrs);
  if (scripts.length) {
    scripts[0].html = script;
    for (const s of scripts.slice(1)) s.html = "";
  } else body.children.push({ html: `${script}\n` });
  return { html: serialize(doc), kit: true, errors, warnings, report: count(doc, charts) };
}

const favicon = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'14\' fill=\'%230f172a\'/%3E%3Cpath d=\'M18 40V24l14-8 14 8v16l-14 8-14-8Z\' fill=\'none\' stroke=\'%23fbbf24\' stroke-width=\'4\' stroke-linejoin=\'round\'/%3E%3Ccircle cx=\'32\' cy=\'32\' r=\'5\' fill=\'%2338bdf8\'/%3E%3C/svg%3E">';

/** The last step before a page is written (both hosts, every page; the CLI, kit pages): a favicon, `lang`, a `<head>`, and the viewport, each only when missing. */
export function prepareRenderedHtml(html) {
  let out = html;
  if (!/<link\b[^>]*\brel=["'][^"']*(?:icon|shortcut icon)[^"']*["'][^>]*>/i.test(out)) {
    if (/<\/title>/i.test(out)) out = out.replace(/<\/title>/i, `</title>\n${favicon}`);
    else if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (head) => `${head}\n${favicon}`);
    else out = out.replace(/<html[^>]*>/i, (tag) => `${tag}\n<head>\n${favicon}\n</head>`);
  }
  if (!/<html\b[^>]*\blang\s*=/i.test(out)) out = out.replace(/<html\b/i, '<html lang="en"');
  if (!/<head[^>]*>/i.test(out)) out = out.replace(/<html[^>]*>/i, (tag) => `${tag}\n<head></head>`);
  if (!/<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (head) => `${head}\n<meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  return out;
}

/** `path` in both hosts: a <name>.src.html file inside the output directory (`dir()`), never a link out of it. */
export function readSourcePath(input, dir) {
  const raw = input.trim();
  if (!/\.src\.html?$/i.test(raw)) throw new Error("path must name a <name>.src.html file");
  const outputDir = realpathSync(dir());
  const requested = resolve(outputDir, raw);
  if (lstatSync(requested, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`${requested} must not be a symlink`);
  const source = realpathSync(requested);
  if (source !== outputDir && !source.startsWith(outputDir.endsWith(sep) ? outputDir : `${outputDir}${sep}`)) throw new Error(`${source} must stay inside ${outputDir}`);
  return { html: readFileSync(source, "utf8"), filename: basename(source).replace(/\.src(\.html?)$/i, "$1"), source };
}

/**
 * The page step shared by the Pi tool and the MCP server. Returns null for an ordinary page. A plan source or a kit page
 * becomes the page, renamed from <name>.src.html, with the source kept beside it.
 */
export function renderPageForHost(html, { root, filename, sendBack = false, models = true }) {
  const plan = renderPlanForHost(html, { root, filename, sendBack, models });
  if (plan) return plan;
  const r = renderPage(html, { sendBack, root, models });
  if (!r.kit) return null;
  if (r.errors.length) throw new Error(`The page has ${r.errors.length} error(s); nothing was written:\n${r.errors.map((e) => `- ${e}`).join("\n")}`);
  const page = filename.replace(/\.src(\.html?)$/i, "$1");
  const source = page.replace(/\.html?$/i, ".src.html");
  const warned = r.warnings.length ? `\nWarnings:\n${r.warnings.map((w) => `- ${w}`).join("\n")}` : "";
  return { html: r.html, filename: page, source, kit: true, report: r.report, note: ` Source kept beside it as ${source}; edit it and render again for revisions.${warned}` };
}

/* ── CLI ── */
function openFile(path) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [path]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", path]] : ["xdg-open", [path]];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const input = argv.find((a, i) => !a.startsWith("-") && !["-o", "--root"].includes(argv[i - 1]));
  if (!input) {
    console.error("usage: node render.mjs page.src.html [-o page.html] [--root <repo>] [--lint] [--open] [--no-check]");
    process.exit(2);
  }
  const output = value("-o") ?? (/\.src\.html?$/i.test(input) ? input.replace(/\.src(\.html?)$/i, "$1") : null);
  if (!output && !flag("--lint")) {
    console.error("name the source <name>.src.html, or pass -o <name>.html");
    process.exit(2);
  }
  const source = readFileSync(input, "utf8");
  const root = value("--root") ?? process.cwd();
  const result = hasPlan(source) ? renderPlan(source, { root }) : renderPage(source, { root });
  const summary = result.summary ?? (result.kit ? "kit inlined" : "no kit marker; written as given");
  for (const w of result.warnings) console.log(`  ⚠ ${w}`);
  for (const e of result.errors) console.log(`  ✗ ${e}`);
  if (result.errors.length) {
    console.log(`✗ ${result.errors.length} error(s), ${result.warnings.length} warning(s); nothing written`);
    process.exit(1);
  }
  const report = result.report ? `\n  ${reportLine(result.report).replaceAll("\n", "\n  ")}` : "";
  if (flag("--lint")) { console.log(`✓ ${summary}${report}`); return; }
  const temp = `${output}.${process.pid}.tmp`;
  // a plan and an ordinary page are written as given; a kit page gets what the hosts add
  writeFileSync(temp, result.kit ? prepareRenderedHtml(result.html) : result.html);
  renameSync(temp, output);
  console.log(`✓ ${resolve(output)}  ${summary}${result.warnings.length ? ` · ${result.warnings.length} warning(s)` : ""}${report}`);
  // a kit page is looked at in a browser, so the agent reads one report and one sheet instead of scripting its own screenshots
  if (result.kit && !hasPlan(source) && !flag("--no-check")) {
    const { lookAt, lookLines } = await import("./look.mjs");
    const looked = await lookAt(output);
    for (const line of lookLines(looked)) console.log(`  ${line}`);
    if (looked.problems.length) {
      console.log(`✗ ${looked.problems.length} visual problem(s); the page was written. Fix them and render again.`);
      process.exitCode = 1;
    }
  }
  if (flag("--open")) openFile(resolve(output));
}

// Node resolves symlinks for import.meta.url, so a renderer reached through a symlinked skill folder must compare real paths
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
