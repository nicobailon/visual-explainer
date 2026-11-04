import assert from "node:assert/strict";
import { renderPage } from "../plugins/visual-explainer/kit/render.mjs";
import { renderPlan } from "../plugins/visual-explainer/plan/render.mjs";

// <ve-ask> attributes (references/kit.md, plans.md): default goes on a <ve-opt>; a question takes id, q and multi, and
// in a plan also data-if.
const page = (ask) => `<!doctype html><html lang="en"><head><title>t</title><link rel="stylesheet" href="kit.css" data-ve-kit></head><body><main>\n${ask}\n</main></body></html>`;
const opts = '<ve-opt value="x">X</ve-opt><ve-opt value="y">Y</ve-opt>';
const askErrors = (r) => r.errors.filter((e) => e.includes("<ve-ask"));

assert.deepEqual(askErrors(renderPage(page(`<ve-ask id="a" q="Pick?" default="x">${opts}</ve-ask>`))), ['line 2 <ve-ask#a>: default goes on the option itself: <ve-opt value="…" default>']);
assert.deepEqual(askErrors(renderPage(page(`<ve-ask id="a" q="Pick?" defualt>${opts}</ve-ask>`))), ["line 2 <ve-ask#a>: unknown attribute defualt=; <ve-ask> takes id, q and multi"]);
const single = renderPage(page('<ve-ask id="a" q="Pick?"><ve-opt value="x">X</ve-opt><ve-opt value="y" default>Y</ve-opt></ve-ask>'));
assert.deepEqual(single.errors, []);
assert.match(single.html, /<input type="radio" name="a" value="y" checked>/);
const multi = renderPage(page('<ve-ask id="a" q="Pick?" multi><ve-opt value="x" default>X</ve-opt><ve-opt value="y" default>Y</ve-opt><ve-opt value="z">Z</ve-opt></ve-ask>'));
assert.deepEqual(multi.errors, []);
assert.equal(multi.html.match(/<input type="checkbox"[^>]* checked>/g).length, 2);

const plan = `<ve-plan title="T" summary="s">\n<ve-claim id="c" level="2" title="C">\n<ve-ask id="mode" q="Mode?"><ve-opt value="soft" default>Soft</ve-opt><ve-opt value="custom">Custom</ve-opt></ve-ask>\n<ve-ask id="days" q="Days?" data-if="mode=custom"><ve-opt value="30" default>30</ve-opt><ve-opt value="90">90</ve-opt></ve-ask>\n</ve-claim>\n</ve-plan>`;
assert.deepEqual(askErrors(renderPlan(plan)), []);

console.log("Ask check passed");
