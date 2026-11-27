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

// a <ve-flow> wider than a page column (5 boxes in a row, or 4 with a long label beside a vertical arrow) warns, and its layout stays as written
const flow = (n) => renderPage(page(`<figure><ve-flow label="l">${[...Array(n)].map((_, i) => `<ve-node id="n${i}" at="${i + 1} 1">N</ve-node>`).join("")}</ve-flow></figure>`));
assert.deepEqual(flow(4).warnings, []);
assert.match(flow(5).warnings.join(), /needs 1053 px to keep labels at 12 px, wider than a page column/);
assert.match(flow(5).html, /ve-flow"[^>]*viewBox="\S+ \S+ 1228 96"/);
assert.match(renderPage(page(`<figure><ve-flow label="l"><ve-node id="a" at="4 1">A</ve-node><ve-node id="b" at="4 2">B</ve-node><ve-edge from="a" to="b" label="retries with exponential backoff later"/></ve-flow></figure>`)).warnings.join(), /wider than a page column/);

console.log("Figure check passed");
