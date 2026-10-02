# Hand-drawn SVG figures

Inline SVG is the default figure. You control every position, it uses page tokens and fonts, and it can animate. `templates/page.html` has the CSS and JS for every pattern here. Copy those blocks as they are; this file gives the markup contracts and the rules.

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

- Sketch in ASCII first, then turn columns and rows into coordinates.
- Make the viewBox width close to the display width (720–1000) so `14` units ≈ 14px. On narrow screens the `.frame` scrolls and the SVG keeps a `min-width`. Text never shrinks below the type minimums.
- At least 40 units between boxes. Orthogonal edges (`M x y H x V y`). Labels 9 units above their line, with the `.ve-el` halo.
- SVG text does not wrap: keep lines short (about 18 characters), `<tspan x=".." dy="1.2em">` for a second line.
- Draw edges first and nodes after, so nodes sit on top.
- A boundary (process, network, trust zone) is a dashed rect with a mono label in its top-left corner.
- Over about 12 nodes, draw a 5–8 node overview and put the detail in cards or a second figure.
- Sequence: one column per actor with a thin lifeline, one row per message, time runs down, each arrow labeled with its call. Schema: one box per table with its key fields in mono, crow's-foot ends for many.

## Kit

```
page   <svg width=0 height=0> defs once: #ve-ah marker (fill="context-stroke"), #ve-node gradient
figure <figure> → .frame (dot-grid stage) → svg.ve-svg[role=img][aria-label] → <figcaption>Fig. N + claim
node   <g class="ve-n [is-key]"> <rect class="sh"/> [<path class="gl"/>] <text/> [<text class="sub"/>] </g>
edge   <path class="ve-e [is-hot|is-async]"/>  + <text class="ve-el [l|r]">verb or value</text>
```

- **Shape says what a thing is.** Rect for a service. Cylinder for a datastore (`path.sh` body + `ellipse.sh.lid`, as Postgres in the template). Rect with 3 short dividers for a queue. Dashed rect for something optional or down.
- **Glyph** (`.gl`): a 16-unit line drawing in the node's top-left corner, only when the kind is not clear from the name. Stroke `--text-dim`, never filled, never emoji.
- **Edge language:** solid = sync call · dashed = async or optional · thick glowing accent = the path this figure is about · red ✕ = blocked.

## Flow dots

Moving dots show direction and volume at a glance. Use them on the main figure when traffic or data moves. The rate must mean something: the ratio of spawn intervals is the real split.

```html
<path data-flow="hit"  data-every="420"  d="M95 105H375V80H695V105H375"/>   <!-- invisible route -->
<path data-flow="miss" data-every="7000" d="M95 105H355V270H395V130H695"/>  <!-- 420:7000 ≈ 94:6 -->
<g class="ve-dots" aria-hidden="true"></g>                                   <!-- after edges, before nodes -->
```

Routes pass through node centers. The dots move under the opaque nodes, so they enter one box and leave the next. One moving layer per page. The script runs dots only while the figure is on screen and the stepper shows the full picture, and never under reduced motion.

## Linked highlighting

Elements that share a `data-ref` light up together: a prose term, a node, an edge, a card, a button. Hovering any of them, or focusing a prose term or button, lights all of them while the other shapes dim. Prose terms get `tabindex="0"`. One element can carry several refs (`data-ref="hit miss"`). Link 2–4 key terms per figure, not every noun.

## Stepper and scene player

The most useful interaction for teaching: each step brings its parts forward with a one-line caption. Add Play and a scrub bar and it becomes a scene player, a small explainer video in one file.

```
<figure class="ve-steps">  parts: data-s="N" (appears at step N) · paths with pathLength="1" draw in
  .ve-player → ol.ve-cap > li[data-n="1/5"] · button[data-go=-1] · button[data-play] · input[type=range] · button[data-go=1]
```

Open on the complete picture, because the first viewport must show the answer. One claim per scene; something visibly changes at every step. Never autoplay. Play stays available under reduced motion, because the reader starts it.

## Before / after

One drawing, same coordinates, a toggle (`button[aria-pressed]` flips `figure[data-view]`; `.only-before` / `.only-after` groups). The reader sees exactly what moves. Added = `--ok` stroke; removed = `--risk` dashed. For a static version, two panels side by side at the same scale.

## Live figure

Controls that recompute the picture, so the reader feels a setting instead of reading about it: a TTL slider moves the hit rate, the flow-dot split, the load bar, and the headline. A policy toggle is a why-demo: on the same data the bad rule gives a nicer, wrong number.

- One to three controls (`input[type=range]`, `button[aria-pressed]`). Each changes something the reader cares about.
- One pure `model(settings)` feeds the figure, the numbers, and the sentence. Nothing else holds state.
- Default to the real current value and mark it on the scale, so the first screen is still the answer. Print and no-JS show that state with no controls: insert them from JS and hide them in print. Reduced motion keeps the controls live and drops only the transitions.
- Show the formula in the caption or a `<details>`. Label a simplified model "illustrative".
- Model the concept, never copy production logic into the page; a copy drifts.

## Small multiples

For a set of cases (failure modes, options, environments), draw the same small diagram once per case instead of writing a table. Same coordinates in each, so the eye sees only the difference. The part that changes takes the case's status color (`.case[data-st]` sets `--st`; mark the changed parts `.is-st`). Each card: status chip, short title, mini diagram, no sentence. Mini labels 13 units or more, cards at least 14.5rem wide.

## Small charts

Every number gets a picture beside it. Each chart has `role="img"` and an `aria-label` with the values.

- **Waffle** (rates, "N of 100"): 10×10 cells, two `<pattern>` fills over three rects.
- **Bars** (2–5 values): value label just past each bar's end. The bar that matters is accent; the rest `--border-bright`. Bars grow in when their block enters.
- **Sparkline** (trend): `0 0 100 24`, one `polyline`, `vector-effect: non-scaling-stroke`.

## Entrance motion

Each top-level block rises 1rem and fades in once. `data-count` numbers count up and bars grow. JS adds `.js-motion` only when motion is allowed, so no-JS, print, and reduced motion show the final state. Nothing beyond this: no parallax, no scroll-jacking, no looping effects other than flow dots.

## 3D with three.js

Use 3D only when depth carries data: embeddings and point clouds, physical or spatial layouts (racks, regions, floor plans), stacks where height is a real quantity, meshes and geometry. A graph of boxes and arrows is never 3D.

```html
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186/examples/jsm/"}}</script>
```

- Canvas in a `.frame` with a fixed aspect ratio, `role="img"`, an `aria-label`, a `Fig. N` caption, and a one-line text fallback with the key numbers.
- Colors from the page tokens via `getComputedStyle`. Labels with `CSS2DRenderer`, so they use the page font. One directional light plus ambient. No bloom, fog, or decorative particles.
- `OrbitControls` with damping and zoom limits, plus a "Reset view" button. Open on an angle that already shows the answer. Auto-rotate only until the first interaction, never under reduced motion.
- `setPixelRatio(Math.min(devicePixelRatio, 2))`, a `ResizeObserver`, and render only while visible.

## Page structure for 4+ sections

Sticky `<nav>` table of contents on the left, content on the right; below 1000px it becomes a sticky top bar. In the top bar, only the link list scrolls sideways: hide its scrollbar (`scrollbar-width:none`, `::-webkit-scrollbar{display:none}`), fade its right edge with `mask-image`, and keep buttons outside it. Mark the active section with an `IntersectionObserver` (`rootMargin:'-10% 0px -80% 0px'`). Wrap `history.replaceState` in `try/catch`, because it throws on `file://` pages.

## Other shapes

- **File map:** nested `<ul>` in mono. Each path gets a status chip (added, modified, deleted) and a `+12 −3` count.
- **Timeline:** a CSS grid with one rail line and dated nodes. The newest item gets the accent.
