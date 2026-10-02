# Mermaid, used sparingly

Use Mermaid only when automatic layout saves real work: sequence, ER/schema, class, git graph, or a graph with 12+ nodes and crossing edges. For everything else, draw SVG by hand (`diagrams.md`).

What to draw is still the same: show the mechanism, label every arrow with a verb, and make one claim per figure. If a graph passes 12 nodes, draw a 5–8 node overview and put the detail in cards.

## Source rules

- Use `flowchart TD`. Use `LR` only for a linear chain of 3–4 nodes.
- Keep IDs simple (`authSvc`) and put readable text in quoted labels: `authSvc["Auth Service"]`.
- Quote any label that has `( ) : , [ ] & /`, or that starts with `/ \ ( {`.
- Break lines with `<br/>` inside quoted flowchart labels. `\n` renders as literal text.
- Sequence messages are plain words. `{} [] <> &` silently break the whole diagram.
- `stateDiagram-v2` labels: no `<br/>`, no parentheses, and one colon only. Otherwise use a flowchart.
- In `classDef`/`style`: never set `color:`. Use 8-digit hex fills with alpha (`fill:#b5761433`) so they work in both schemes.
- Arrows: `-->` main flow · `-.->` async or optional · `==>` critical path · `--x` blocked.

## Shell

Every diagram gets zoom, pan, pinch, fit, 1:1, and expand. Keep the source in a separate element so you can re-render it.

```html
<figure>
  <div class="diagram-shell" role="img" aria-label="(the claim)">
    <div class="mermaid-wrap">
      <div class="zoom-controls"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="fit" aria-label="Fit">⤢</button><button data-z="one" aria-label="Actual size">1:1</button><button data-z="open" aria-label="Open full size">↗</button></div>
      <div class="mermaid-viewport"><div class="mermaid-canvas"></div></div>
    </div>
    <script type="text/plain" class="diagram-source">
flowchart TD
  a["Client"] -->|"GET /u"| b["API"]
    </script>
  </div>
  <figcaption>(the claim, one sentence)</figcaption>
</figure>
```
```css
.mermaid-wrap { position:relative; height:min(70vh,640px); background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
.mermaid-viewport { position:absolute; inset:0; cursor:grab; touch-action:none; }
.mermaid-viewport.is-panning { cursor:grabbing; }
.mermaid-canvas { transform-origin:0 0; }
.mermaid-canvas svg { display:block; max-width:none; }
.zoom-controls { position:absolute; top:8px; right:8px; z-index:2; display:flex; gap:2px; }
.zoom-controls button { width:2rem; height:2rem; }
```
```js
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
// For dense graphs, add ELK: import elk from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs'; mermaid.registerLayoutLoaders(elk); and set layout:'elk'.
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const config = () => ({ startOnLoad:false, theme:'base', themeVariables:{
  fontFamily:tok('--font-body'), fontSize:'16px', background:tok('--bg'),
  primaryColor:tok('--bg'), primaryTextColor:tok('--text'), primaryBorderColor:tok('--text-dim'),
  secondaryColor:tok('--accent'), tertiaryColor:tok('--bg'), lineColor:tok('--text-dim'),
  edgeLabelBackground:tok('--bg'), clusterBkg:tok('--bg'), clusterBorder:tok('--border') } });
const renders = [];
for (const shell of document.querySelectorAll('.diagram-shell')) {
  const vp = shell.querySelector('.mermaid-viewport'), canvas = shell.querySelector('.mermaid-canvas');
  const src = shell.querySelector('.diagram-source').textContent.trim();
  let z = 1, x = 0, y = 0, w = 0, h = 0;
  const apply = () => { canvas.style.transform = `translate(${x}px,${y}px) scale(${z})`; };
  // Readability floor: never below 0.75 (16px labels stay >= 12px); a bigger graph pans instead of shrinking.
  const zoomFor = (s) => Math.min(Math.max(s * 0.92, 0.75), 2);
  const fit = () => { const W = vp.clientWidth, H = vp.clientHeight; z = zoomFor(Math.min(W / w, H / h));
    x = Math.max((W - w * z) / 2, 0); y = Math.max((H - h * z) / 2, 0); apply(); };
  const zoomAt = (f, cx = vp.clientWidth / 2, cy = vp.clientHeight / 2) => {
    const n = Math.min(Math.max(z * f, 0.1), 8); x = cx - (cx - x) * n / z; y = cy - (cy - y) * n / z; z = n; apply(); };
  const render = async () => {
    const { svg } = await mermaid.render('m' + Math.random().toString(36).slice(2), src);
    // Parse instead of innerHTML: keeps Mermaid's foreignObject labels and avoids scanner warnings.
    canvas.replaceChildren(document.importNode(new DOMParser().parseFromString(svg, 'text/html').querySelector('svg'), true));
    const el = canvas.querySelector('svg'), vb = el.viewBox.baseVal;
    w = vb.width; h = vb.height; el.setAttribute('width', w); el.setAttribute('height', h);
    shell.querySelector('.mermaid-wrap').style.height = Math.round(Math.min(Math.max(h * zoomFor(vp.clientWidth / w) + 32, 240), innerHeight * 0.8)) + 'px';
    fit();
  };
  shell.querySelector('.zoom-controls').onclick = (e) => {
    const a = e.target.closest('[data-z]')?.dataset.z;
    if (a === 'in') zoomAt(1.2); if (a === 'out') zoomAt(1 / 1.2); if (a === 'fit') fit(); if (a === 'one') zoomAt(1 / z);
    if (a === 'open') { const page = `<!doctype html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:${tok('--bg')}">${canvas.innerHTML}</body>`;
      open(URL.createObjectURL(new Blob([page], { type:'text/html' }))); }
  };
  vp.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault();
    const r = vp.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); }, { passive:false });
  // One pointer pans; two pinch-zoom around their midpoint. Lifting one finger hands back to a smooth pan.
  const pts = new Map(); let span = 0;
  vp.addEventListener('pointerdown', (e) => { vp.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); vp.classList.add('is-panning'); });
  vp.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; pts.set(e.pointerId, e);
    if (pts.size === 1) { x += e.clientX - p.clientX; y += e.clientY - p.clientY; return apply(); }
    const [a, b] = pts.values(), d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), r = vp.getBoundingClientRect();
    if (span) zoomAt(d / span, (a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top); span = d; });
  const up = (e) => { pts.delete(e.pointerId); span = 0; if (!pts.size) vp.classList.remove('is-panning'); };
  vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
  vp.addEventListener('dblclick', fit);
  new ResizeObserver(() => w && fit()).observe(vp);
  renders.push(render);
}
mermaid.initialize(config());
// Mermaid bakes colors into the SVG; a theme or font switch must re-render every diagram.
window.rerenderDiagrams = () => { mermaid.initialize(config()); return Promise.all(renders.map((r) => r())); };
window.rerenderDiagrams().catch((err) => console.error('Mermaid render failed:', err));
```

Mermaid themes cannot read CSS variables, so `config()` resolves them from computed style. A `prefers-color-scheme` change needs a reload or a `matchMedia` listener that calls `rerenderDiagrams()`.

Style Mermaid output only through the shell. Never add a page-level `.node`, `.edgeLabel`, or `.cluster` rule.
