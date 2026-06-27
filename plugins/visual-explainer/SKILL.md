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

## Optional generated images

If `surf` is available, generated images may be embedded as base64 for hero banners, conceptual illustrations, or educational visuals. Skip images for data-heavy, structural, or Mermaid/CSS-suitable content. Pages must stand on CSS, typography, and diagrams without images.

## Final checklist

Before delivery, verify:

- complete HTML document;
- standard favicon `<link rel="icon">` present immediately after `</title>`;
- output written to the requested path;
- no console errors when opened;
- no horizontal overflow at normal desktop width;
- fonts load with fallbacks;
- tables preserve rows/columns and wrap long text;
- Mermaid diagrams use `diagram-shell` with zoom/pan/expand;
- slides fit one viewport, include carousel dots, and preserve source coverage;
- visual hierarchy makes the main idea obvious in the first viewport;
- styling would still be recognizable if compared against a generic dark/violet template.
