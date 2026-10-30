# The kit

The kit is the shared CSS, fonts, SVG defs, and script of every page. You write one marker line; the renderer puts the kit in its place. This sheet lists what it gives you; `diagrams.md` gives the drawing rules and `motion.md` the steppers, replays, and live figures.

## The source

```html
<!doctype html>
<html lang="en" data-register="blueprint">
<head>
<title>94% of reads never touch the database</title>
<link rel="stylesheet" href="kit.css" data-ve-kit>
<style>/* this page's CSS only */</style>
</head>
<body><main>
  <header>
    <p class="eyebrow">Read path</p>
    <h1><span class="num">94%</span> of reads never touch the database</h1>
    <p class="lead">One sentence. <b>One key phrase.</b></p>
    <p class="meta">service · source · date range</p>
  </header>
  <figure>
    <div class="frame"><svg class="ve-svg" viewBox="0 0 800 300" aria-label="What the picture shows">…</svg></div>
    <figcaption><span class="fig-n">Fig. 1</span>The claim in one sentence.</figcaption>
  </figure>
  <section>
    <div class="sec-head"><p class="ve-label caps">Load</p><h2>The takeaway as a heading</h2></div>
    …
  </section>
  <section class="sources" aria-label="Sources"><p class="ve-label caps">Sources</p><p><code>src/cache/user.ts:14</code></p></section>
</main></body>
</html>
```

The renderer adds the charset, viewport, favicon, fonts, kit CSS and script, and the SVG defs (`#ve-ah` arrowhead, `#ve-node` fill, `#ve-w-on` / `#ve-w-off` waffle cells).

**Registers:** `data-register="instrument"` (default), `blueprint`, `paper`, or `editorial` (`style-guide.md`). Use the tokens as `var(--accent)`, `var(--s-4)`; a page's own `:root { --accent: … }` wins over the kit.

The kit already styles plain HTML, so a page adds none of it: a section's paragraphs and lists at 65ch, `<pre>` code blocks, bare `<ul>`/`<ol>`, and the gaps between a section's blocks. A page's own rule always wins.

## Parts

| Part | Markup |
|---|---|
| Node | `<g class="ve-n [is-key]"><rect class="sh"/> [<path class="gl"/>] <text/> [<text class="sub"/>]</g>`; text centres on its `y`; a datastore is `path.sh` + `ellipse.sh.lid`; `<text class="ve-kind">` names the kind |
| Edge | `<path class="ve-e [is-hot\|is-async]"/>`, arrowhead included, + `<text class="ve-el [l\|r]">verb</text>` (`l` ends at `x`, `r` starts there); draw edges before nodes |
| Boundary, slots, axes | `rect.ve-bnd` + `text.ve-bnd-t` tag; `rect.ve-slot` (`.is-on` filled); `.ve-axis` lines + `text.ve-axis-t` |
| Label | `<text class="ve-tag [key\|risk]">` for a note or a count on a drawing; SVG text with no fill renders black, which is a render error |
| Table | `<div class="ve-table"><table>`; `class="num"` on number cells; `<small>` for a note in a cell |
| Flags | `.is-new`, `.is-gone` on `.ve-n` or `.ve-e`; `<text class="ve-x">✕</text>` marks a blocked edge |
| KPI strip | `.kpis` › `.kpi`: `<span class="ve-label">Hit rate</span><span class="val"><span data-count="94">94</span><span class="unit">%</span></span>` + a data tag; `data-count` counts up |
| Small multiples | `.cases` › `<div class="case" data-st="ok\|warn\|risk">`: a chip, `<h3>`, `<svg class="ve-mini" viewBox="0 0 240 128">`; changed parts `.is-st`, a missing part `.is-off` |
| Chips | `<span class="chip ok\|warn\|risk">word</span>` |
| Section nav | 4+ sections: `<nav class="ve-toc" aria-label="Sections"><div><a href="#load">Load</a>…</div><span class="pos"></span></nav>` before `<main>`; the section in view is marked and counted |
| Linked highlighting | `data-ref="redis"` on any part; a prose term is `<span class="ve-ref" data-ref="redis" tabindex="0">` (`diagrams.md`) |
| Stepper, replay, callouts, dimensions, flow dots | `.ve-steps` with `data-s`, `.ve-tok`, `.ve-at`, `.ve-vals` (`motion.md`); `.ve-co`, `.ve-dim`, `data-flow` (`diagrams.md`) |

## Data tags

A tag becomes the SVG it describes. Put `<ve-bars>` and `<ve-waffle>` in a `.kpi` or a `<figure>`, and `<ve-stack>` in a `.frame`, which scrolls it on a narrow screen. `label` is the sentence a screen reader reads instead of the picture.

```html
<ve-bars unit="ms" max="9" label="A hit takes 1 ms; a miss takes 9 ms"><ve-bar value="1" hot>hit</ve-bar><ve-bar value="9">miss</ve-bar></ve-bars>
<ve-waffle value="94" note="6 misses" label="94 of 100 reads hit Redis"></ve-waffle>
<ve-stack unit="k" label="Postgres serves 6k of 100k reads"><ve-bar value="94">Redis</ve-bar><ve-bar value="6" hot>Postgres</ve-bar></ve-stack>
```

- **Bars:** rows in the order written, from zero, each value with its unit; `hot` marks the bar that matters. Charts with the same `max` share one scale, with labels of up to 9 characters and values (with unit) of up to 6; longer is a render error.
- **Waffle:** `value` is a whole number from 0 to 100; `note` names the off cells.
- **Stack:** one bar split in proportion; a narrow segment's label drops a row.

`<ve-flow>` lays out boxes and arrows on a grid, so you write no coordinates, and brings its own `.frame`.

```html
<figure class="ve-steps">
  <ve-flow label="The API asks Redis; a miss reads Postgres.">
    <ve-node id="api" at="1 1" sub="user-service" key data-s="1" data-ref="api">API</ve-node>   <!-- at="column row" -->
    <ve-node id="redis" at="2 1" data-s="0 2" data-ref="redis">Redis</ve-node>
    <ve-node id="pg" at="1 2" shape="db" data-s="3">Postgres</ve-node>
    <ve-edge from="api" to="redis" label="get key" data-s="2"/>
    <ve-edge from="api" to="pg" label="miss · 9 ms" hot data-s="3"/>
  </ve-flow>
  <div class="ve-player">…</div>
  <figcaption>…</figcaption>
</figure>
```

Flags: `key`, `hot`, `async`, `new`, `gone`. `data-s` and `data-ref` work as on drawn parts; each arrow with `data-s` gets a replay token. Arrow labels about 12 characters at most. Render errors name their line: `line 42 <ve-bar>: value="-3" is negative`.

A state machine in the user's code: a `<script type="text/plain" model>` child walks it, and the render draws the arrows, the marks, and the replay (`machines.md`).

`<ve-ask id="ttl" q="Key lifetime?"><ve-opt value="60">60 s</ve-opt><ve-opt value="300">5 min</ve-opt></ve-ask>` asks the reader to choose; the answer joins their reply. `default` and `multi` are optional.
