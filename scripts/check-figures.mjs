import assert from "node:assert/strict";
import { renderPage } from "../plugins/visual-explainer/kit/render.mjs";

// references/kit.md: the render numbers each .fig-n in page order, fills links to a figure, and stops on tags that never close.
const page = (body) => `<!doctype html><html lang="en"><head><title>t</title><link rel="stylesheet" href="kit.css" data-ve-kit></head><body><main>\n${body}\n</main></body></html>`;
const fig = (id, n = "") => `<figure id="${id}"><figcaption><span class="fig-n">${n}</span>claim</figcaption></figure>`;

const numbered = renderPage(page(`${fig("a", "Fig. 7")}<figure><figcaption><span class="fig-n">Key</span>k</figcaption></figure>${fig("b")}<p>See <a href="#b"></a> and <a href="#a">Fig. 9</a>.</p>`));
assert.deepEqual(numbered.errors, []);
assert.deepEqual([...numbered.html.matchAll(/<span class="fig-n">([^<]*)<\/span>/g)].map((m) => m[1]), ["Fig. 1", "Key", "Fig. 2"]);
assert.match(numbered.html, /See <a href="#b">Fig\. 2<\/a> and <a href="#a">Fig\. 1<\/a>/);
assert.equal(renderPage(numbered.html).html, numbered.html);

assert.deepEqual(renderPage(page(`${fig("a")}<a href="#c"></a>`)).errors, ['line 2 <a>: href="#c" names no numbered <figure>']);
assert.deepEqual(renderPage(page(`<details><summary>More</summary>\n${fig("a")}`)).errors, ["line 2 <details>: never closed; add </details>"]);
assert.deepEqual(renderPage(page(`${fig("a")}\n</figure><p>ok</p>`)).errors, ["line 3 </figure>: closes nothing; remove it"]);
assert.deepEqual(renderPage(page(fig("a")).replace("</main>", "</main>\n<script>let x = 1;")).errors, ["line 4 <script>: never closed; add </script>"]);

// a <ve-flow> row of 5+ boxes would scroll sideways on a page, so it turns to run top-down; 4 in a row stay as written
const flow = (n) => renderPage(page(`<figure><ve-flow label="l">${[...Array(n)].map((_, i) => `<ve-node id="n${i}" at="${i + 1} 1">N</ve-node>`).join("")}</ve-flow></figure>`)).html.match(/ve-flow"[^>]*viewBox="\S+ \S+ (\d+) (\d+)"/).slice(1).map(Number);
assert.ok(flow(4)[0] > flow(4)[1] && flow(5)[0] < flow(5)[1]);

console.log("Figure check passed");
