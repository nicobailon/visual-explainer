# Hand-drawn SVG figures

Inline SVG is the default figure: exact placement, page tokens and fonts, and motion. The kit (`kit.md`) styles and runs every pattern here; this file gives the markup contracts and the rules.

Steps, replays, live figures, and 3D: `motion.md`.

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

- Sketch in ASCII first, then turn columns and rows into coordinates. Labels 14 units or more; the renderer sizes the drawing so they stay readable on a phone, whatever the viewBox.
- At least 40 units between boxes. Orthogonal edges (`M x y H x V y`). Labels 9 units above their line.
- SVG text does not wrap: lines of about 18 characters, `<tspan x=".." dy="1.2em">` for a second line.
- A boundary (process, network, trust zone) is a dashed `rect.ve-bnd` with a `text.ve-bnd-t` label in its top-left corner.
- Over about 12 nodes, draw a 5–8 node overview and put the detail in cards or a second figure.
- Sequence: one column per actor with a thin lifeline, time runs down, each arrow labeled with its call. Schema: one box per table with its key fields in mono, crow's-foot ends for many.

## Shapes

- **Shape says what a thing is.** Rect for a service. Cylinder for a datastore (`path.sh` + `ellipse.sh.lid`). Rect with 3 short dividers for a queue. Dashed rect for something optional or down.
- **Glyph** (`.gl`): a 16-unit line drawing in the node's top-left corner, only when the name does not say the kind. Never emoji.
- **Edges:** solid = sync call · dashed = async or optional · thick glowing accent = the path this figure is about · red ✕ = blocked.

## Dimensions

A number that measures a span sits on that span: latency down a sequence's time axis, a TTL window on a timeline, a field's size on a byte layout.

```
   ┼                       ┼    extension lines from the two measured points
   │◄─────── 9 ms ────────►│    dimension line, value in a gap at its middle
```

```html
<g class="ve-dim"><path class="ext" d="M120 300V322M380 300V322"/><path class="ln" d="M120 316H380M116 320l8-8M376 320l8-8"/><text x="250" y="310">9 ms</text></g>
```

- A short 45° tick at each end. The value sits centered 6 units above the line, never on it.
- Dimensions run on rails beside the shapes, the shortest nearest. Spans that add up (`1 ms` then `9 ms`) chain on one rail, with the total on the next rail out.
- The dimension that carries the claim takes the accent (`.is-key`), one per figure.

## Flow dots

Moving dots show direction and volume on the main figure when traffic or data moves. The ratio of spawn intervals is the real split.

```html
<path data-flow="hit"  data-every="420"  d="M95 105H375V80H695V105H375"/>   <!-- invisible route -->
<path data-flow="miss" data-every="7000" d="M95 105H355V270H395V130H695"/>  <!-- 420:7000 ≈ 94:6 -->
<g class="ve-dots" aria-hidden="true"></g>                                   <!-- after edges, before nodes -->
```

Routes pass through node centers, so dots enter one box and leave the next. One moving layer per page.

## Linked highlighting

Elements that share a `data-ref` light up together: a prose term, a node, an edge, a card, a button. Prose terms get `tabindex="0"`; one element can carry several refs (`data-ref="hit miss"`). Link 2–4 key terms per figure, not every noun.

## Callouts

A numbered circle with a short leader line that ends exactly on the point it names; plan heroes use the same mark. In a stepper, callout N is step N: give the circle and its leader `data-s="N"`. Without a stepper, list them under the figure as one-line notes (`③ the miss reads Postgres`). 3–6 per figure.

```html
<path class="ann" data-s="3" d="M520 71V96"/><g class="ve-co" data-s="3" transform="translate(520 60)"><circle r="11"/><text>3</text></g>
```

## Before / after

One drawing in the same coordinates with a toggle (`button[aria-pressed]` flips `figure[data-view]`; `.only-before` / `.only-after` groups). Added = `--ok` stroke; removed = `--risk` dashed. Static: two panels side by side at the same scale.

## Small multiples

The same small diagram once per case, in the same coordinates, so the eye sees only the difference. The part that changes takes the case's status color (`.case[data-st]`; mark a kit edge or node `.is-st`, and give your own shapes `var(--st)`). Each card: status chip, short title, mini diagram, no sentence. Mini labels 14 units or more.

## Small charts

A number that does not measure a span gets a small chart beside it: `<ve-waffle>` for "N of 100", `<ve-bars>` for 2–5 values (`hot` on the one that matters), `<ve-stack>` for a share of a whole (`kit.md`). A trend is a sparkline: `0 0 100 24`, one `polyline`, `vector-effect: non-scaling-stroke`, with an `aria-label` holding the values. A drawn chart's axes and ticks are `.ve-axis`, their labels `.ve-axis-t`.

## Page structure for 4+ sections

A kit `<nav class="ve-toc">` before `<main>` (`kit.md`), one link per section `id`. The kit makes it sticky, scrolls it sideways on a phone, and marks the section in view.

## Other shapes

- **File map:** nested `<ul>` in mono; each path gets a status chip (added, modified, deleted) and a `+12 −3` count.
- **Timeline:** a CSS grid with one rail line and dated nodes; the newest gets the accent.
