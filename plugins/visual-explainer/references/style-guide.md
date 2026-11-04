# Style guide

Choose a register from the content, then let the subject tint it (Topic motif). The kit already follows this guide for its own classes; the rules here are for what you write and draw.

## Registers

| Register | Use for | Signature |
|---|---|---|
| **Instrument** | diff and plan reviews, audits, metrics, status | A KPI strip near the top when there are metrics. Tabular numbers everywhere. Cells split by hairlines, not floating cards. Status as shape + word. |
| **Blueprint** | architecture, data flow, systems, visual plans | 24px grid on the background. Boundaries as dashed frames with a mono tag. Numbered callouts ① ② on the drawing. Dimension lines for spans. |
| **Paper** | concepts, how-it-works, fact-checks, long reading | Serif headings. Narrow text column, wide figures. Margin notes at ≥ 1200px. `Fig. N` labels. |
| **Editorial** | recaps, narratives, decks, showcases | Display type at full scale. Asymmetric grid with large empty areas. One number or phrase per screen carries the page. |

The project's own design system overrides the register; a named palette → `themes.md`. A kit page gets each register's fonts and tokens from `data-register` (names in `kit.md`); only a slide or video deck copies its register's block from `kit/kit.css`. `--border-bright` (3:1) carries meaningful outlines, `--border` only decorative rules.

## Visual principles

1. **Quiet ground, one signal.** About 90% of the page is neutral. The accent marks only what the reader must look at now: the key node, the hot path, the active control, the one number that matters.
2. **The figure is the interface.** A prose term and its element in the figure light up together (`data-ref`).
3. **Overview, then detail.** The full picture first; the reader steps, hovers, or expands for detail. Raw material goes in `<details>`, but sources stay in a visible section at the end.
4. **Motion shows change or flow.** Blocks rise in once, dots move at the real rate, steps reveal parts, a replay runs one event per step (`motion.md`). No parallax, scroll-jacking, or decorative loops. Under reduced motion, show the final state.
5. **Craft is part of the meaning.** Shapes say what a thing is; the kit gives `.is-key` a halo and `.is-hot` a glow: one key node, one hot path.

## Typography

- **Measure:** the kit sets 65ch on a section's text; text in your own cards and columns gets about 65ch too, side notes 40–50ch. Break display lines at phrase boundaries. Flush left; never justify. Promote only what must be read first.
- **Numerals:** `tabular-nums` in tables, KPIs, and anything that updates; proportional in prose (oldstyle in Paper); number columns right-aligned. Format for reading (`5.6k`, `−86%`), repeat the unit in every label, and state the comparison (`from 5,600`).
- **Characters:** curly quotes. `–` for ranges, `—` for a break, `−` for minus, `×` for multipliers, `…`, `≤`. A no-break space between number and unit (`1&nbsp;ms`).
- **Emphasis:** bold or italic, never both; italics and uppercase (`.caps`) only for 3 words or fewer. Underline only links and linked terms.

## Layout

- **Grid:** 12 columns; text about 8, figures 12, section labels and side notes 3. Every left edge on a column line; one flush-left edge for headline, figures, and captions. Center only a single number or a title slide.
- **Entry points:** each screen has one dominant element, one or two secondary ones, and quiet text; blurred, the dominant element still reads. Show position (`2 / 5`, section nav).
- **Section opener:** one kind per page: `.sec-head` (label beside the `h2`) for reviews, a small label above the `h2` for explainers, a full-width figure titled by the `h2` for narratives.
- **Proximity:** space above a heading is 2–3× the space below it. Related things sit closer than unrelated ones.
- **Rhythm:** vary width and density: wide figure → number strip → small multiples → short text. Never three identical blocks in a row.
- **Structure:** space first, a hairline second, a frame last. No card inside a card. Asymmetric empty space reads as deliberate; evenly spread gaps read as unfinished.

## Figures

- **Which figure:** the figure table in SKILL.md; a process or change of state is a stepper or replay (`motion.md`).
- **Data-ink:** every mark carries data or guides the eye. No chart borders, plot backgrounds, heavy gridlines, or 3D bars. Gridlines in `--border`, only when values must be read.
- **Layering:** ground < structure < data < signal (accent), each quieter than the one above. Two lines close together make a third shape: add space or merge them.
- **Smallest difference:** each distinction as subtle as it can be while still clear. Two label levels: small and dim, larger and bright.
- **Labels:** on the data, horizontal, left-aligned, with the unit. No legend under 5 series. A `--bg` halo where a label crosses a line.
- **Annotate:** one or two notes per chart at the point the caption names: a short leader line and a plain phrase.
- **Honest scale:** bars start at zero. Small multiples share one scale. Sort by value unless the order means something. Line charts about 2:1 to 3:1.
- **Line weights:** 1 for structure, 1.5–1.75 for data and outlines, 2.5–3 for the signal.
- **Color scales:** sequential: one hue in OKLCH lightness steps. Diverging: two hues around a neutral middle. Categorical: up to 5 hues at equal OKLCH lightness and chroma.

## Topic motif

The subject adds a light touch of its own, so a page about Postgres does not look like a page about audio: 2–3 touches at most.

- **Accent hue:** the subject's own color, adjusted to 4.5:1 in both schemes (Postgres blue, Rust orange). Keep the register accent if the hue reads as a status (red ≈ risk, green ≈ ok; Redis red → keep).
- **Stage texture:** the register's grid by default; ruled lines for writing, isometric grid for hardware. 15% contrast or less.
- **Glyphs:** node glyphs from the domain's own symbols, line-drawn: circuit symbols, map pins, a waveform, a git branch.
- **Type detail:** one typographic habit of the domain: price columns for finance, mono timestamps for incidents, small caps for specs.
- **Shape language:** the domain's own diagram convention: swimlanes for processes, a ledger for accounting, a timing staff for protocols.

Cut any touch whose removal makes the page no harder to read and no less specific. No puns, mascots, or illustration.

## Your own CSS

Reuse the kit's classes first, so the same element looks the same everywhere. What you add uses only the kit's steps (`--t-label`…`--t-h1`, `--s-1`…`--s-8`, `--r-1`, `--r-2`, `--fast` `--med` `--slow` with `--ease`).

- **Spacing:** `s-2`–`s-4` inside a component, `s-5`–`s-6` between components, `s-8` between sections. A bigger gap means less related.
- **Radius:** `r-1` for chips, buttons, inputs, and inline highlights; `r-2` for frames, tables, and overlays. Nothing else is rounded.
- **Color:** one accent, on 10% of the screen or less; `ok warn risk info` only mean status. A dimmed label uses `--text-dim`, never opacity; on `--accent-dim` use `--text`.
- **Motion:** only `transform`, `opacity`, and `stroke-dashoffset`: `fast` for hover, `med` for state, `slow` for steps. Shadow (`--lift`) only on raised nodes and overlays.
- **Callout:** surface, `r-2`, padding `s-4`, a status chip as its title. No colored side bar.
- **Code block:** mono `--t-small`, surface, `r-2`, padding `s-4`, scrolls sideways.
- Nothing shifts on load: every SVG has a `viewBox`, every image a width and height.
