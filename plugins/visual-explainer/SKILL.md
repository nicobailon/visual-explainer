---
name: visual-explainer
description: Generate self-contained HTML visual explanations for systems, code changes, plans, data, and technical concepts. Use for diagrams, architecture overviews, diff or plan reviews, project recaps, comparison tables, slide decks, and other visual explanations.
license: MIT
compatibility: Requires a browser to view generated HTML files. Optional surf-cli for AI image generation.
metadata:
  author: nicobailon
  version: "0.8.1"
---

# Visual Explainer

Generate self-contained HTML pages that explain systems, code changes, plans, data, and technical concepts visually. Use this skill for diagram requests, architecture overviews, diff/plan reviews, project recaps, comparison tables, slide decks, and any visual explanation.

## Trigger and delivery rules

- Prefer an HTML page over terminal ASCII when the output is inherently visual.
- If a table would have 4+ rows or 3+ columns, render it as HTML and give only a short chat summary.
- Write files to `~/.agent/diagrams/` or the explicit eval output path. Use descriptive filenames.
- Open generated pages in the browser when running normally. In Pi package installs, use `visual_explainer` with `prepare` for planning/context and `render` only after the complete HTML document exists.
- The final page must be a complete self-contained HTML document, including embedded CSS and any needed JS.
- Always include the standard self-contained data-URI favicon immediately after `</title>` (see "Favicon" below). Never leave a page without a favicon.

## Favicon

Every generated page must include this exact self-contained data-URI favicon, placed immediately after the `</title>` tag. It needs no external file and is a small node-graph glyph that matches the dark/accent palette:

```html
<link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNyIgZmlsbD0iIzBmMTcyOSIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxMC41IiByPSIzIiBmaWxsPSIjZDRhNzNhIi8+PGNpcmNsZSBjeD0iMjMiIGN5PSIxMC41IiByPSIzIiBmaWxsPSIjNjBhNWZhIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIyMi41IiByPSIzIiBmaWxsPSIjNGFkZTgwIi8+PHBhdGggZD0iTTkgMTAuNSBMMTYgMjIuNSBMMjMgMTAuNSIgc3Ryb2tlPSIjZDRhNzNhIiBzdHJva2Utd2lkdGg9IjEuNyIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg==">
```

If math is rendered with KaTeX, escape `<` as `&lt;` inside `$$...$$` (e.g. `y_{&lt;t}`); a bare `<` makes the HTML parser truncate the formula.

## Reference routing

Read only the references needed for the current output:

| Need | Read |
|---|---|
| Text-heavy architecture/cards | `./templates/architecture.html` |
| Mermaid flowcharts, sequence, ER, state, class, C4, data flow | `./templates/mermaid-flowchart.html`, Mermaid sections in `./references/libraries.md` |
| Data tables, comparisons, audits | `./templates/data-table.html` |
| Slide decks | `./templates/slide-deck.html`, `./references/slide-patterns.md` |
| CSS layout, overflow, depth, collapsibles, SVG connectors, generated images | `./references/css-patterns.md` |
| Pages with 4+ major sections | `./references/responsive-nav.md` |
| Prose-heavy pages | “Prose Page Elements” in `css-patterns.md`, typography sections in `libraries.md` |

## Choose the representation

| Content | Default representation |
|---|---|
| Flowchart, pipeline, state machine, decision tree | Mermaid |
| Sequence, ER/schema, class, C4, topology-focused architecture | Mermaid |
| Text-heavy architecture, module internals, implementation plans | CSS grid cards, optionally with a Mermaid overview |
| 15+ element architecture | Hybrid: small Mermaid overview + CSS detail cards |
| Comparison/audit/status matrix | Semantic HTML `<table>` |
| Timeline/roadmap | CSS timeline |
| Dashboard/metrics | CSS grid + charts/KPIs |
| Slide deck | `100dvh` slides using slide template patterns |

## Mermaid invariants

- Use `theme: 'base'` with custom `themeVariables` matching the page palette.
- For complex diagrams use ELK layout when available.
- Never use bare `<pre class="mermaid">`.
- Use the canonical `diagram-shell` pattern from `templates/mermaid-flowchart.html`: `.diagram-shell` > `.mermaid-wrap` > `.zoom-controls` + `.mermaid-viewport` > `.mermaid-canvas`.
- Every Mermaid diagram needs zoom in/out/reset/expand controls, Ctrl/Cmd+scroll zoom, drag panning, and click-to-expand.
- Prefer `flowchart TD` for complex diagrams. Use `LR` only for simple 3–4 node linear flows.
- Use `<br/>` in quoted flowchart labels. Do not use escaped `\n` labels.
- Never define page-level `.node`; Mermaid uses it internally. Use namespaced page classes such as `.ve-card`.
- For 15+ elements, do not cram everything into one Mermaid diagram. Use the hybrid overview + cards pattern.

## Layout and style invariants

- Use semantic HTML where it helps accessibility and copy/paste: `<table>`, headings, lists, `<details>`, captions.
- Use CSS custom properties for palette: `--bg`, `--surface`, `--border`, `--text`, `--text-dim`, and 3–5 accents.
- Pick a clear aesthetic direction before writing: blueprint, editorial, paper/ink, terminal, IDE-inspired, or data-dense.
- Avoid generic defaults: no body font that is only Inter, Roboto, Arial, Helvetica, or system-ui; no violet/fuchsia Tailwind-default accents as the main palette (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`); no cyan+magenta+purple neon dashboard; no gradient-mesh blobs.
- Good font pair families: DM Sans + Fira Code; Instrument Serif + JetBrains Mono; IBM Plex Sans + IBM Plex Mono; Bricolage Grotesque + Fragment Mono; Plus Jakarta Sans + Azeret Mono.
- Good accent directions: terracotta+sage, teal+slate, rose+cranberry, amber+emerald, deep blue+gold.
- Prevent overflow: `min-width: 0` on grid/flex children, `overflow-wrap: break-word` for long text, and scroll containers for wide tables/code.
- **Labels must never be clipped.** When a badge/tag straddles a box edge (e.g. a code-block filename pill at `top: -12px`), the box must NOT have `overflow: auto/hidden` — that slices the label. Put the scroll on an inner element instead (`overflow: visible` on the badge container, `overflow-x: auto` on the inner `<pre>`/scroller). Likewise keep SVG/mermaid `<text>` inside the viewBox and tab/section labels within their pill.
- Do not set `display: flex` directly on `<li>` when list markers matter.
- Use depth sparingly: hero/elevated only for primary sections; flat/recessed for reference material.
- Use entrance/hover animation only when it clarifies hierarchy. Respect `prefers-reduced-motion`. Do not use continuous glow, pulse, or breathing effects on static content.

## Slide deck mode

Use slides only when explicitly requested or when a command asks for slides. Slides are a different medium, not a paginated article:

- Each slide is one viewport (`100dvh`) with no page-level scrolling.
- Use larger type, fewer objects per slide, varied compositions, and visible navigation.
- Include slide nav chrome from `slide-deck.html`: prev/next controls, slide count, keyboard navigation, and carousel dots/indicators.
- Before writing HTML, inventory the source and map every source item to slides.
- Do not drop content to fit a fixed slide count. Add slides instead.
- Use the 10 slide types from `slide-patterns.md`: Title, Section Divider, Content, Split, Diagram, Dashboard, Table, Code, Quote, Full-Bleed.

## Reader-first defaults (pages are made to be read and re-read)

The primary use is a reader consuming the page, often over multiple sittings. Build for that:

- **Navigation**: ship the upgraded `SlideEngine` from `slide-deck.html` — it adds deep-link hashes (`#slide-7`), resume-where-you-left-off (localStorage), reading percent in the counter, an outline overlay (press `O`), and a keyboard help panel (press `?`). Don't ship a stripped engine.
- **Comprehension**: open each section with its one-line takeaway, then expand (TL;DR-first). End a multi-section page with a short "what to remember" recap.
- **Glossary**: wrap domain jargon in `<abbr title="one-line definition">term</abbr>` so a reader can hover/tap for meaning without leaving the page.
- **Don't gate content on motion**: every slide must be fully readable even if its animation never plays; animations enhance, never reveal essential text.
- **Accessibility**: don't rely on color alone (pair with shape/label); respect `prefers-reduced-motion`; keep body text ≥ 16px with generous line-height; ensure keyboard nav reaches everything.

## House design language v2 (make it beautiful)

Default look for decks (reference implementation: any deck styled like `the-gradient-view`):

- **Type system**: `Space Grotesk` for display (titles/heads, tight tracking), `Inter` body, `JetBrains Mono` for code/kickers, and `Instrument Serif` *italic* as the accent voice — `<i>` inside leads/heads renders serif-italic in gold. Title = gradient text (ink → gold → peach).
- **Depth, not flatness**: body gets two fixed layers — aurora radial glows (gold top-left, sky bottom-right, mint accent) + an SVG-noise grain at ~3% opacity. Surfaces are **glass**: `rgba(255,255,255,.035)` + `backdrop-filter: blur(12-14px)` + 1px `rgba(255,255,255,.09)` border + deep soft shadow + inset top highlight.
- **Editorial details**: huge **ghost slide numerals** (Space Grotesk, ~4% opacity) top-right of every slide; kickers flanked by gradient hairlines; progress bar is a glowing gold→peach gradient.
- **Motion**: reveals rise with slight scale + **blur-in** (`blur(6px)→0`), staggered ~90ms; MCQ options nudge right + glow on hover; correct answers get a soft green glow. All gated by `prefers-reduced-motion`.
- **Color voice**: gold = emphasis/labels, mint = "in english"/success, sky = structure/where, rose = errors/failures, dim slate for prose. Light scheme maps to warm paper (#f7f3ea).
- Callout grammar: `.eng` (mint glass, ◍ prefix) for English readings; `.trace` (dark glass, ⌁ prefix) for numeric traces; `.ww` chips (sky/gold left-border) for where/why.

## Learning-first rules (for teaching/explainer decks)

When the deck's purpose is to teach (concepts, math, papers, systems):

- **Honest evidence tags**: label every claim's status with a small pill — `real` (measured, from actual runs/files), `building` (in progress), `planned`, `polluted/void` (known-bad measurement). Never present illustrative numbers as real.
- **Code + concept travel together**: a formula or concept slide either includes the minimal code it corresponds to, or explicitly signposts "next slide: the code".
- **Retrieval practice**: end substantial teaching decks with a "Test yourself" slide before the final bleed — 2–3 **clickable multiple-choice questions** (`.mcq` pattern in `templates/slide-deck.html`: click an option → correct answer highlights green, wrong pick red, explanation appears). Plausible distractors, instant feedback. Recall beats re-reading; feedback beats bare recall.
- **Prediction before reveal**: for the 1–2 headline results, pose the question on its own slide first ("guess before you advance") and reveal on the next. Prediction-then-feedback beats passive presentation — delegated reading scores &lt;40% on comprehension; active inquiry scores far higher.
- **Shared vocabulary**: name each core concept once with one vivid metaphor (e.g. KL = "leash", mixed data = "soup", repair = "orthogonal fix") and reuse the exact same term + color across every deck in the series. Never introduce synonyms for an established metaphor — shared words are what let author and reader riff.
- **At most one explorable**: a single small interactive element (slider/toggle driving a formula or plot) is allowed per deck when direct manipulation genuinely teaches the idea (e.g. vary ε and watch the clip region). Never decorative; the deck must teach fully with it inert.
- **Verify-yourself ending**: decks explaining work an agent did (code, training runs, changes) end with the one command or check the reader can run themselves to confirm the headline claim — the goal is a reader deeper in the loop, not just informed.
- **Depth-first (do not hide the concept)**: for technical/teaching decks, derive — don't assert. Every mechanism gets three layers on adjacent slides: (1) the math, derived in steps small enough to follow; (2) the concept the math encodes, named plainly; (3) *why it works* — the gradient/information/geometry-level reason. Plug the run's actual numbers into the derivations (real logprobs, real dims, real lr). Status/narrative slides are allowed only as connective tissue between depth slides, never the substance of the deck.
- **Executable traces**: when a trace derives from raw values (logprobs, logits), compute it **in-page with JS** from the embedded raw data (`.xtrace[data-lps]` and `.xslider` helpers in `templates/slide-deck.html`) instead of hand-typing results — hand arithmetic can silently be wrong; computed traces can be poked.
- **Fact ledger (provenance + retraction)**: projects with evolving claims keep a ledger (`scripts/facts.py`; JSONL of id/claim/value/source/status). Deck elements citing a ledger fact carry `data-fact="id"`. Retraction = `facts.py void` (one flag), then `facts.py verify *.html` finds every deck citing dead facts. Never state a `real` number that has no source.
- **Equation anatomy (no untranslated math)**: every displayed equation must be accompanied, on the same slide, by: (a) **where it fits** — one line locating it in the pipeline; (b) **why it exists** — the problem it solves; (c) **its English reading** — the formula spoken as a sentence, symbol by symbol ("loss = how surprised you were by the correct token"); (d) **a raw numeric trace** — concrete input values flowing through the formula to a concrete output (`p=0.344 → L=−ln 0.344=1.068 nats`). An equation without its sentence and its trace is not done.
- **Series wiring**: when 3+ decks cover one topic, create/refresh an index page (card grid, reading order, one-line summaries) and wire each deck with `data-series-prev/next/index` attributes on `<body>` — the template's series-nav script renders prev/series/next links (keys `N`/`P`). The last deck's `next` points at the index.
- **Resume never lands on the end**: the engine must not restore a saved position equal to the final slide (start fresh instead); mid-deck resume stays.

## Optional generated images

If `surf` is available, generated images may be embedded as base64 for hero banners, conceptual illustrations, or educational visuals. Skip images for data-heavy, structural, or Mermaid/CSS-suitable content. Pages must stand on CSS, typography, and diagrams without images.

## Deck build discipline (agent workflow)

- **Engine source of truth**: inject the SlideEngine from `templates/engine.js` in this skill's directory (resolve relative to SKILL.md). Never depend on `/tmp` copies or retype it.
- **One validation gate**: after writing any deck, run `python3 <repo>/scripts/check-deck.py <file>.html` (managed clone: `~/Code/Zereraz/visual-explainer`). Fix every FAIL before delivering. Do not hand-roll per-deck validation snippets.

## Final checklist

Before delivery, verify:

- complete HTML document;
- standard favicon `<link rel="icon">` present immediately after `</title>`;
- decks use the upgraded SlideEngine (outline `O`, help `?`, deep-link + resume, reading %);
- each slide readable with animations disabled; no content depends on motion;
- output written to the requested path;
- no console errors when opened;
- no horizontal overflow at normal desktop width;
- fonts load with fallbacks;
- tables preserve rows/columns and wrap long text;
- Mermaid diagrams use `diagram-shell` with zoom/pan/expand;
- slides fit one viewport, include carousel dots, and preserve source coverage;
- visual hierarchy makes the main idea obvious in the first viewport;
- styling would still be recognizable if compared against a generic dark/violet template.
