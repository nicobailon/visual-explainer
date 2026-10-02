# Hand-drawn SVG figures

Inline SVG is the default figure. You control every position, it uses page tokens and fonts, and it can animate. `templates/page.html` shows all of these patterns working together.

## Plan on a grid

```
x:  40        280        520        760      columns 240 apart
    ┌──────┐  GET /u   ┌──────┐  miss   ┌──────┐
y:90│Client│──────────►│ API  │────────►│  DB  │
    └──────┘           └──┬───┘         └──────┘
                     hit  │ reads
y:210                  ┌──▼───┐
                       │Cache │
                       └──────┘
```

- Sketch the layout in ASCII first, then turn columns and rows into coordinates.
- Make the viewBox width close to the display width (720–1000) so `14` units ≈ 14px. On narrow screens, put the SVG in a scroll container with `min-width`. Do not let text shrink below the type minimums.
- Leave at least 40 units between boxes. Draw edges as orthogonal paths (`M x y H x V y`). Put each label about 9 units above its line. The `.ve-el` halo is only for a label that must cross a line, because the line still shows between the letters.
- SVG text does not wrap. Keep each line to 18 characters or fewer and use `<tspan x=".." dy="1.2em">` for a second line.
- Show a boundary (process, network, trust zone) as a dashed rect with a mono label in its top-left corner.

## Kit

```html
<figure class="ve-fig">
  <svg class="ve-svg" viewBox="0 0 800 300" role="img" aria-label="API reads cache; a miss falls through to DB">
    <defs><!-- markers do not inherit the path's color: one marker per edge color -->
      <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--text-dim)"/></marker>
      <marker id="ah-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker></defs>
    <g class="ve-n" transform="translate(40 60)"><rect width="160" height="60" rx="6"/><text x="80" y="30">Client</text></g>
    <g class="ve-n is-key" transform="translate(280 60)"><rect width="160" height="60" rx="6"/><text x="80" y="30">API</text></g>
    <path class="ve-e" d="M200 90H280" marker-end="url(#ah)"/><text class="ve-el" x="240" y="80">GET /u</text>
  </svg>
  <figcaption>Cache hits never reach the database.</figcaption>
</figure>
```

```css
.ve-svg { width:100%; height:auto; display:block; font:500 15px var(--font-body); }
.ve-n rect { fill:var(--surface); stroke:var(--border-bright); stroke-width:1.5; }
.ve-n text { fill:var(--text); text-anchor:middle; dominant-baseline:central; }
.ve-n.is-key rect { stroke:var(--accent); stroke-width:2.5; }
.ve-e { fill:none; stroke:var(--text-dim); stroke-width:1.75; }
.ve-e.is-async { stroke-dasharray:5 5; }
.ve-e.is-hot { stroke:var(--accent); stroke-width:2.5; }
.ve-el { fill:var(--text-dim); font:500 12px var(--font-mono); text-anchor:middle;
         paint-order:stroke; stroke:var(--bg); stroke-width:5px; stroke-linejoin:round; }
figcaption { font-size:.9375rem; color:var(--text-dim); margin-top:.75rem; }
```

Edge language: solid = sync call · dashed = async or optional · thick accent = the path this figure is about · red ✕ = blocked.

## Highlight a path

Readers hover or focus a legend item, and every element on that path lights up while the others dim.

```html
<div class="ve-legend"><button data-p="hit">Cache hit</button><button data-p="miss">Cache miss</button></div>
<!-- tag drawing parts: <path class="ve-e" data-p="miss" ...> ; one element can carry "hit miss" -->
```
```css
.ve-fig[data-active] [data-p] { opacity:.25; transition:opacity .2s; }
.ve-fig[data-active="hit"] [data-p~="hit"], .ve-fig[data-active="miss"] [data-p~="miss"] { opacity:1; }
```
```js
for (const b of document.querySelectorAll('.ve-legend [data-p]')) {
  const fig = b.closest('.ve-fig');
  const on = () => fig.dataset.active = b.dataset.p, off = () => delete fig.dataset.active;
  b.onmouseenter = b.onfocus = on; b.onmouseleave = b.onblur = off;
}
```

## Stepper and scene player

This is the most useful interaction for teaching. The full drawing appears faintly, and each step brings its parts forward with a caption. Add play and a scrub bar, and the stepper becomes a scene player: a small explainer "video" in one HTML file.

```html
<figure class="ve-steps">
  <svg class="ve-svg" ...>  <!-- data-s="N": part appears at step N -->
    <g class="ve-n" data-s="1">…</g> <path class="ve-e" data-s="2" pathLength="1" …/>
  </svg>
  <ol class="ve-cap"><li>Client sends GET /u.</li><li>API checks the cache first.</li></ol>
  <div class="ve-ctl">
    <button data-go="-1" aria-label="Previous step">←</button>
    <button data-play>Play</button>
    <input type="range" min="0" value="0" aria-label="Scene">
    <button data-go="1" aria-label="Next step">→</button>
  </div>
</figure>
```
Copy the `.ve-steps` CSS and script from `templates/page.html` as they are. A part with `data-s="N"` stays faint until step N, then turns `.on`. The current step's parts also get `.now`. A path with `pathLength="1"` draws itself in.

Scene rules: one claim per scene. Each caption is one sentence. Something visibly changes at every step. Open on the complete picture, because the first viewport must show the answer. Never autoplay. Keep Play available under reduced motion, because the reader starts it.

## Before / after

Use one drawing with the same coordinates and a toggle. The reader sees exactly what moves.

```html
<figure class="ve-fig" data-view="before">
  <button aria-pressed="false" onclick="const f=this.closest('figure');const a=f.dataset.view==='after';f.dataset.view=a?'before':'after';this.setAttribute('aria-pressed',String(!a))">Show after</button>
  <svg>… <g class="only-before">…</g> <g class="only-after is-added">…</g> …</svg>
</figure>
```
```css
[data-view="before"] .only-after, [data-view="after"] .only-before { display:none; }
.is-added rect { stroke:var(--ok); }  .is-removed rect { stroke:var(--risk); stroke-dasharray:4 4; }
```

For static before/after, put two panels side by side with the same scale. Red marks removed or before, green marks added or after, amber marks risk.

## Small charts

```html
<div class="ve-bar" style="--v:.72" role="img" aria-label="72%"></div>
<!-- sparkline: 100×24 box; scale points into it -->
<svg viewBox="0 0 100 24" class="ve-spark"><polyline points="0,20 20,14 40,16 60,8 80,10 100,3"/></svg>
```
```css
.ve-bar { height:.5rem; background:var(--border); border-radius:99px; }
.ve-bar::before { content:''; display:block; height:100%; width:calc(var(--v)*100%); background:var(--accent); border-radius:inherit; }
.ve-spark { width:6rem; height:1.5rem; } .ve-spark polyline { fill:none; stroke:var(--accent); stroke-width:1.5; vector-effect:non-scaling-stroke; }
```

## Page structure for 4+ sections

Use a two-column grid: a sticky `<nav>` table of contents on the left and content on the right. Below 1000px, the nav becomes a sticky horizontal bar. Mark the active section with an `IntersectionObserver` (`rootMargin:'-10% 0px -80% 0px'`). On link click, scroll first, then run `try { history.replaceState(null,'','#'+id) } catch {}`, because `file://` pages throw on this call.

## Other shapes

- **File map:** nested `<ul>` in mono. Each path gets a status chip (added, modified, deleted) and a `+12 −3` count.
- **Timeline:** a CSS grid with one rail line and dated nodes. The newest item gets the accent.
- **KPI row:** big tabular number, a label, a delta chip, and a sparkline.
- **Reference material** (full tables, raw logs): put it in `<details>` so it does not compete with the figures.
