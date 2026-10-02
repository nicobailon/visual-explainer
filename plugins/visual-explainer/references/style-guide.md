# Style guide

One system, four registers, and a topic motif on top. Choose the register from the content, then let the subject tint it (Topic motif below). The scale, components, and polish pass apply to all of them. `templates/page.html` is the Instrument register built to this guide.

## Registers

| Register | Use for | Display / body / mono | Signature |
|---|---|---|---|
| **Instrument** | diff and plan reviews, audits, metrics, status | Geist 600 / Geist / Geist Mono | A KPI strip near the top when there are metrics. Tabular numbers everywhere. Cells split by hairlines, not floating cards. Status as shape + word. |
| **Blueprint** | architecture, data flow, systems, visual plans | IBM Plex Sans 600 / IBM Plex Sans / IBM Plex Mono | 24px grid on the background. Boundaries as dashed frames with a mono tag. Numbered callouts ① ② on the drawing. |
| **Paper** | concepts, how-it-works, fact-checks, long reading | Newsreader 500 / Atkinson Hyperlegible Next / Atkinson Hyperlegible Mono | Narrow text column, wide figures. Margin notes at ≥ 1200px. `Fig. N` labels. |
| **Editorial** | recaps, narratives, decks, showcases | Instrument Serif / Instrument Sans / JetBrains Mono | Display type at full scale. Asymmetric grid with large empty areas. One number or phrase per screen carries the page. |

The project's own design system overrides the register. If the user names a palette, use `themes.md`.

Token order: `--bg --surface --border --border-bright --text --text-dim --accent --ok --warn --risk --info`. The first scheme listed is the default; put the other one in `prefers-color-scheme`. Every text token reaches 4.5:1 on `--bg` and on `--surface`. `--border-bright` reaches 3:1, so it carries meaningful outlines (diagram nodes, controls). `--border` is for decorative frames and rules only.

| Register · scheme | Values |
|---|---|
| Instrument · dark | `#0b0d0c #121614 #1f2522 #5e6662 #e6ebe8 #919d97 #f2a93b #6fcf97 #e8c547 #ef6f5c #6cb6e0` |
| Instrument · light | `#f4f5f3 #ffffff #dfe3e0 #888e8b #121614 #545e59 #955700 #1c7443 #7a5e00 #b0341e #1a6890` |
| Blueprint · dark | `#0d1520 #132031 #22324a #596b87 #e3ecf5 #92a6bb #ffb547 #6fd3a0 #e8d36a #ff7b6b #7cc0f0` |
| Blueprint · light | `#f2f6fa #ffffff #d6e0ea #818f9e #0f1a26 #4d6074 #a34700 #1c7443 #776300 #b0341e #145f99` |
| Paper · light | `#f7f7f4 #ffffff #e3e3dc #8e8e8a #17191c #575c63 #2c4cd0 #1d7443 #836000 #b3301d #1b6a94` |
| Paper · dark | `#111316 #181b1f #262a30 #62676c #e8e8e3 #9ba1a9 #93a6ff #6cc492 #e3b94d #f0806b #6fb8dc` |
| Editorial · light | `#fbfbf9 #f1f0ec #e2e0da #8c8a85 #111111 #5a5853 #cc3418 #1d7443 #836000 #a01d48 #1b6a94` |
| Editorial · dark | `#0f0f0f #1a1a19 #2b2a28 #696763 #f2f0eb #a4a19b #ff6e50 #6cc492 #e3b94d #f57fa2 #7cb8e8` |

Effect tokens, per scheme. Dark: `--node-top: color-mix(in srgb, var(--text) 7%, var(--surface)); --lift: rgb(0 0 0 / .45); --halo: 32%`. Light: `--node-top: var(--surface); --lift: rgb(18 22 20 / .12); --halo: 22%`.

`--accent-dim` = the accent at 12–16% alpha. Blueprint grid: `background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 24px 24px` at about 50% opacity.

## Visual principles

1. **Quiet ground, one signal.** About 90% of the page is neutral. The accent marks only what the reader must look at now: the key node, the hot path, the active control, the one number that matters.
2. **The figure is the interface.** A term in the prose and its element in the figure are linked. Hover either one, or focus the prose term, and both light up (`diagrams.md` → Linked highlighting).
3. **Overview, then detail.** The full picture comes first. The reader steps, hovers, or expands to get detail. Raw material goes in `<details>`.
4. **Every number gets a picture.** A waffle, bar, or sparkline beside it. Tabular figures, the unit smaller and in `--text-dim`, and the comparison stated (`from 5,600`).
5. **Motion shows change or flow.** Blocks rise in once. Dots move along edges at the real rate. Steps reveal parts. Nothing loops for its own sake.
6. **Craft is part of the meaning.** Nodes sit raised on a dot-grid stage. Shapes say what a thing is (a cylinder is a store). The one focal element gets a soft halo, the hot path a glow. No glassmorphism, neon, gradient text or backgrounds, blobs, clip-art, or emoji.

## Typography

| | Rule |
|---|---|
| Hierarchy | Few sizes, big jumps. Contrast comes from the gap between body and display, not from many middle steps. Each level changes one or two of size, weight, and color, never all three. Start with every word quiet, then promote only what must be read first. |
| Measure | Body about 65ch (45–75 characters per line; 66 is the classic ideal). Side notes and multi-column text 40–50. Lead 40–50ch. |
| Leading | Body 1.5–1.6 on screen; more for a longer measure, less for a shorter one. Display 1.0–1.15, tighter as it grows. |
| Tracking | Display tightens as it grows: −0.01em at `h2`, −0.03 to −0.04em at `h1` and big numbers. All caps and small caps get +0.05 to +0.12em. Never track lowercase body text. |
| Breaks | `text-wrap: balance` on headings, `pretty` on paragraphs and captions. Break display lines at phrase boundaries. Flush left, ragged right; never justify on the web. |
| Numerals | `tabular-nums` in tables, KPIs, and anything that updates. Proportional figures in prose (oldstyle in Paper). Number columns right-aligned. Format for reading (`5.6k`, `−86%`) and repeat the unit in every label. |
| Characters | Curly quotes and apostrophes. `–` for ranges, `—` for a break, `−` for minus, `×` for multipliers and sizes, `…`, `≤`. A no-break space between number and unit (`1&nbsp;ms`). |
| Font hygiene | `font-kerning: normal; font-synthesis: none`, and load every weight you use: no faux bold, italic, or small caps. Ligatures on in prose, off in code. Bold or italic, never both. Underline only links and linked terms. |
| Optical edges | `text-box: trim-both cap alphabetic` on headings and big numbers, so spacing is measured from the letters, not the line box (Chrome, Safari; harmless elsewhere). Hang bullets and opening quotes outside the text edge. |
| Pairing | One family plus its mono, or one display face plus one text face. The display face only at `h1`, `h2`, and hero sizes. |

## Layout

| | Rule |
|---|---|
| Grid | 12 columns on the 64rem container, `s-5` gutter. Text spans about 8 columns, figures 12, section labels and side notes 3. Every left edge lands on a column line. |
| One axis | Kicker, headline, deck, figures, captions, and section labels share one flush-left edge. Center only a single number or a title slide. |
| Entry points | Reading order: kicker → headline → deck → figure → caption → body. Each screen has one dominant element, one or two secondary ones, and quiet text. Squint test: blur the page and the dominant element still reads. |
| Section opener | Pick one per page and keep it. Swiss head: a hairline, a mono label in columns 1–3, the `h2` in 4–12 on a shared baseline (reports, reviews; `page.html`). Kicker head: a small label above the `h2` (explainers). Figure head: a full-width figure first, the `h2` as its title (narratives). |
| Proximity | Space above a heading is 2–3× the space below it. A caption sits `s-3` from its figure. Related things are always closer than unrelated things. |
| Rhythm | Vary width and density down the page: wide figure → number strip → grid of small multiples → short text. Avoid three identical blocks in a row. |
| Structure | Space first, a hairline second, a frame last. No card inside a card. Leave real empty space; asymmetric space reads as deliberate, evenly spread gaps read as unfinished. |

## Figures

| | Rule |
|---|---|
| Pick by relationship | Change over time → line or sparkline. Magnitude → bars. Part of a whole → waffle or stacked bar. Ranking → sorted bars. Deviation → bars around zero. Distribution → strip or histogram. Correlation → scatter. Flow → diagram with flow dots. Place → map. |
| Data-ink | Every mark carries data or guides the eye. No chart borders, plot backgrounds, heavy gridlines, or 3D bars. Gridlines in `--border`, only when values must be read. |
| Layering | Ground (texture, rules) < structure (nodes, axes) < data < signal (accent). Each layer is quieter than the one above it. Two lines close together make a third shape (1+1=3): add space or merge them. |
| Smallest difference | Make each distinction as subtle as it can be while it is still clear. Two label levels only: small and dim, larger and bright; bold for emphasis inside them. |
| Labels | On the data, horizontal, left-aligned. Repeat the unit. No legend under 5 series. A `--bg` halo where a label crosses a line. |
| Annotate | One or two notes per chart at the point the caption names: a short leader line and a plain phrase. |
| Honest scale | Bars start at zero. Small multiples share one scale. Sort by value unless the order means something. Line charts about 2:1 to 3:1. |
| Line weights | Three: 1 for structure, 1.5–1.75 for data and outlines, 2.5–3 for the signal. Glyph strokes match the stem weight of the labels beside them. |
| Color scales | Sequential: one hue in OKLCH lightness steps. Diverging: two hues around a neutral middle. Categorical: up to 5 hues at equal OKLCH lightness and chroma. Never color alone. |
| Optical alignment | Center a label on its cap height, not its box. Nudge triangles and play icons toward their point; round shapes overshoot a flat edge by about 2%. |

## Topic motif

The register sets the base. The subject adds a light touch of its own, so a page about Postgres does not look like a page about audio. Take the motif from the subject and use it in 2–3 places at most.

| Lever | Rule | Examples |
|---|---|---|
| Accent hue | The subject's own color (brand, material, convention), adjusted to 4.5:1 on `--bg` and `--surface` in both schemes. Keep the register accent if the hue reads as a status color (red ≈ risk, green ≈ ok). | Postgres blue · Rust orange · Kubernetes blue · Redis red → keep the register accent |
| Stage texture | Dot grid by default. 24px line grid for systems and plans, ruled lines for writing, isometric grid for hardware and 3D. Texture at 15% contrast or less. | |
| Glyphs | Node glyphs from the domain's own symbols, line-drawn. | circuit symbols · map pins · waveform · git branch |
| Type detail | One typographic habit of the domain. | price columns for finance · mono timestamps for incidents · small caps for specs · superscript citations for research |
| Shape language | The domain's own diagram convention. | swimlanes for processes · ledger for accounting · timing staff for protocols · floor plan for physical layout |

Test each touch: if removing it makes the page no harder to read and no less specific to the topic, cut it. No puns, mascots, or illustration.

## Scale

```css
:root {
  color-scheme: light dark;
  --t-label: .75rem; --t-small: .875rem; --t-body: 1rem; --t-lead: 1.25rem;
  --t-h2: 1.625rem; --t-h1: clamp(2.25rem, 5.5vw, 4rem); --t-hero: clamp(3rem, 9vw, 6.5rem);
  --s-1: .25rem; --s-2: .5rem; --s-3: .75rem; --s-4: 1rem;
  --s-5: 1.5rem; --s-6: 2rem; --s-7: 3rem; --s-8: 4.5rem;
  --r-1: 4px; --r-2: 10px;
  --ease: cubic-bezier(.16, 1, .3, 1); --fast: 150ms; --med: 300ms; --slow: 500ms;
}
```

| Decision | Rule |
|---|---|
| Spacing | Scale steps only. Inside a component: `s-2`–`s-4`. Between components: `s-5`–`s-6`. Between sections: `s-8`. A bigger gap means less related. |
| Type | Seven sizes, no others, plus sizes a component spec names (KPI value). The steps run about ×1.25 apart, with a big jump to display. `--t-hero` only in Editorial. `--t-small` only for buttons, code, and mono labels. Body 400; headings 600, or the display face at 400–500. Leading and tracking: see Typography. |
| Labels | Mono, `--t-label`, `--text-dim`. Uppercase with `.08em` tracking only for 3 words or fewer. |
| Radius | `r-1` for chips, buttons, inputs, and inline highlights. `r-2` for frames, tables, and overlays. Nothing else is rounded. Blueprint uses `r-1` everywhere. |
| Accent | One accent, on 10% of the screen or less. Status colors (`ok warn risk info`) only mean status. |
| Motion | Move and reveal only with `transform`, `opacity`, and `stroke-dashoffset`. Color changes on hover and highlight may fade at `fast`. `med` for state, `slow` for steps and entrances, 900ms for count-ups and bar growth. Always `--ease`. |
| Effects | Shadow (`--lift`): raised diagram nodes and overlays only. Glow: the key node (`--halo`) and the hot edge only. |
| Layout | Container max 64rem on a 12-column grid. Text about 65ch. Figures use the full width. Card grids: `repeat(auto-fit, minmax(13rem, 1fr))`. |

## Components

| Component | Spec |
|---|---|
| Page header | Kicker (mono label with a short accent rule) → `h1` that states the answer → deck: lead (`t-lead`, `--text-dim`, one bold phrase in `--text`, a sentence or two). If the answer is a number, the number leads the `h1` in accent. Then a quiet meta line (scope, period). `s-4` between them. |
| Figure | `<figure>` → `.frame` (stage: `--bg` with the motif texture, 1px border, `r-2`, padding `s-5`) → `<figcaption>` (`t-body`, `--text-dim`) that starts with `Fig. N` in mono and states the claim. |
| Dimming | To focus part of a figure, fade shapes and lines to 15–25% opacity. Never fade text: dimmed labels change to `--text-dim`, and labels of future steps are hidden. Never put accent-colored text on `--accent-dim`; use `--text` there. |
| Diagram | Node: `#ve-node` gradient fill, 1.5 `--border-bright` stroke, rx 6, `--lift` shadow. Key node: accent tint fill, 2 `--accent` stroke, halo. Edge: 1.75 `--text-dim`. Hot edge: 2.75 `--accent` with a 5px glow. Async: dash `6 5`. One arrowhead marker with `context-stroke`. Edge labels: mono, 14 units, 9 units above the line, `--bg` halo. Identical in every figure. |
| KPI strip | One frame. Cells split by 1px rules (flex-wrap, `gap:1px` over a `--border` background, cells `flex:1 1 14rem` so a wrapped row stretches). Each cell: label → value (2.75rem, 600, tabular, −0.04em, counts up) → its picture (waffle, bars, or sparkline). |
| Small multiples | Cards in `repeat(auto-fit, minmax(14.5rem, 1fr))`: chip → short title → mini diagram. The changed part takes the case's status color. Replaces a table when rows are scenarios. |
| Chip | Mono `t-label` 600, 1px `currentColor` border, `r-1`. Shape and word: ● ok · ▲ warn · ■ risk · ◆ info. |
| Table | Header: surface, label style. Cells: `t-body`, padding `s-3 s-4`. Row rules only. Numbers right-aligned and tabular. Inside `.table-scroll` with an `r-2` frame. |
| Button | Mono `t-small`, surface, 1px `--border-bright`, `r-1`, padding `s-2 s-3`. Hover and focus: accent border. |
| Callout | Surface, `r-2`, padding `s-4`, a status chip as its title. No colored side bar. |
| Code | Mono `t-small`, surface, `r-2`, padding `s-4`, scrolls horizontally. Inline code: `.875em`, no box. |

## Polish pass

- The same element looks the same everywhere: captions, chips, arrowheads, stroke widths.
- `::selection` uses `--accent-dim`. Sections get `scroll-margin-top` under a sticky nav.
- Hover and focus look the same. Every control has a visible focus ring.
- Nothing shifts on load: every SVG has a `viewBox`, and every image has a width and height.
- `@media print`: switch to the light-scheme values on a white ground, hide controls and moving dots, drop shadows and glows, show every step fully drawn, and keep figures and cards from splitting across pages.
