---
name: visual-explainer
description: Generate self-contained HTML visual explanations for systems, code changes, plans, data, and technical concepts. Use for diagrams, architecture overviews, diff or plan reviews, project recaps, comparison tables, slide decks, animated explainers, and other visual explanations.
license: MIT
compatibility: Requires a browser to view generated HTML files. Optional surf-cli for AI image generation.
metadata:
  author: nicobailon
  version: "0.11.0"
---

# Visual Explainer

Turn what you know into something a person understands in ten seconds.

```
words  ──►  diagram  ──►  interactive page  ──►  animated explainer
 slow        better        DEFAULT HERE           when asked
```

Climb as high as the request allows. The default output is one HTML page whose spine is figures. Text is caption, not content.

## Deliver

- Write `~/.agent/diagrams/<descriptive-name>.html`, or the path the user gives. One complete file: inline CSS, JS, and SVG favicon. CDN only for fonts and libraries.
- Pi: `visual_explainer` `prepare` → `render` (ask before `prepare` unless a visual was requested). MCP: render tools default to `open:false`. Elsewhere: write the file and open it. Use `viewer:"glimpse"` only on request.
- If a terminal table would have 4+ rows or 3+ columns, render HTML and reply with one summary line.
- Write a Markdown companion (`<name>.md` beside the HTML) only when the user asks for AI-readable output or a source brief. HTML stays the source. Ask before you overwrite one.
- Quick mode: only for a literal `--quick` on `/generate-web-diagram`, `/diff-review`, `/plan-review`, `/project-recap`. Do the same research, read `./quick/README.md` and `./quick/schema.json`, emit the JSON spec, and render with `action:"render_quick"` (Pi) or `node <this skill's directory>/quick/render.mjs spec.json out.html` (resolve the path from the skill directory, not the user's repo). If the content does not fit or rendering fails, use full HTML.

## Show, don't tell

1. **One claim per figure.** Put each figure in `<figure>`; the `<figcaption>` states the claim in one sentence.
2. **Figures lead.** Every section opens with a figure. Prose after it: 3 sentences or fewer.
3. **First viewport = the answer.** The main idea as a picture plus one sentence. No decorative hero.
4. **Draw the mechanism, not the name.** A request path through a cache beats a box labeled "cache". Label every arrow with a verb: `writes`, `invalidates`, `polls 30s`.
5. **Draw the difference.** To compare options, show the edge or box each one adds or removes.
6. **Encode state in form.** Shape, position, and pattern, plus color. Never color alone.
7. **Numbers get a visual.** Bar, sparkline, or delta chip. A number inside a sentence is lost.

| Content | Figure |
|---|---|
| Architecture, data flow, pipeline, state, before/after | Hand-drawn inline SVG → `references/diagrams.md` |
| Cards, timelines, file maps, side-by-side | CSS grid/flex |
| Matrix, audit, comparison | `<table>` with status chips |
| Metrics, trends | Inline SVG bars or sparklines; Chart.js only for many interactive series |
| Sequence, ER/schema, class, git graph, 12+ nodes with crossings | Mermaid → `references/mermaid.md` |
| A process that changes over time | Stepper or scene player → `references/diagrams.md` |
| Slide deck | `references/slides.md` + `templates/slide-deck.html` |

Mermaid is the exception. Use it only when automatic layout saves real work. Hand-drawn SVG gives exact placement, page fonts, theme tokens, and animation. `templates/page.html` is the reference build: copy its structure and swap in the register the content needs.

## Words

Write about 80% of the way to ASD-STE100 (Simplified Technical English):

- Answer first, detail after. Headings state the takeaway ("Cache hits skip Postgres"), not the topic ("Caching").
- One idea per sentence. 20 words or fewer. Active voice, present tense.
- Paragraphs: 3 sentences at most. Bold one key phrase per paragraph, never more.
- One term per concept, the same every time. Name things by what the reader sees, not by internal structure.
- No idioms, metaphors, filler, or hedges. Specific beats clever. Controls say exactly what they do.
- Use numbered lists for steps. Use plain words over jargon. Spell out an abbreviation the first time.

## Look

Aim for the standard of the best research and engineering pages: exact, calm, and dense with meaning. The reader should feel that someone who understands the system drew every line on purpose.

Always read `references/style-guide.md` before HTML. Precedence: the user's words → the project's design system → the style guide.

```
content ──► register ──────────► fonts + palette + signature, used exactly
reviews, audits, metrics     Instrument   Geist · near-black · amber signal
architecture, flows, plans   Blueprint    IBM Plex · blue-black grid · safety orange
concepts, long reading       Paper        Newsreader + Atkinson Hyperlegible · ink blue
recaps, narratives, decks    Editorial    Instrument Serif + Sans · vermilion
```

- **Quiet ground, one signal.** Neutrals carry the page. The accent marks only what the reader must look at now.
- **The figure is the interface.** Prose terms and figure elements light up together. Values appear on hover or focus. Overview first, detail on demand.
- **Precision is the decoration.** Exact alignment, one stroke weight per role, labels in place, tabular numbers with smaller units. Nothing that carries no data.
- **Stay on the scale.** No sizes, gaps, radii, or colors outside the style guide. Consistency is what makes a page look finished.
- **Two schemes:** tokens on `:root`, and `prefers-color-scheme` redefines tokens only. One theme is fine for a one-shot page.
- **Never:** Inter, Roboto, Arial, or system-ui as the only font; violet or fuchsia Tailwind accents; neon; gradient blobs or heroes; glass, glow, or pulse; emoji markers; centered everything; an accent bar on a rounded card; `01/02/03` when order does not matter.
- **Reading comfort:** `html{font-size:17px}`, `rem` elsewhere. Body ≥ 16px, labels ≥ 12px, SVG labels ≥ 12px as rendered. 45–68ch, left-aligned. Text ≥ 4.5:1, lines ≥ 3:1. Italics and uppercase only for a few words. One focal point per viewport. No motion the reader did not start. Show position (`2 / 5`, section nav). Slides keep their `clamp()` px scale.
- **Themes:** switchable themes or fonts, or a named palette (Dracula, Nord…) → `references/themes.md`.

## Known traps

- Set `min-width:0` on grid/flex children, `grid-template-columns:minmax(0,1fr)` on single-column grids, and `overflow-wrap:anywhere` on paths. Put wide tables, code, and SVG in a scroll container.
- Do not put `display:flex` on `<li>` when its markers matter.
- Never style a page-level `.node`; Mermaid uses it. Use a prefix such as `.ve-`.
- Wrap `history.replaceState` in `try/catch`. It throws on `file://` pages.
- Add section navigation (sticky TOC with scroll-spy) only for 4+ sections.
- Respect `prefers-reduced-motion`. Motion must explain something.

## Animate

When the user asks for an animated explainer or a video:

- **Default:** an HTML scene player. SVG scenes with play, pause, scrub, and captions, all in one file. See `references/diagrams.md`.
- **Real video (3Blue1Brown style):** first check which tools are installed. Use Manim, Remotion, or Motion Canvas for visuals and ffmpeg to mux. For narration, use ElevenLabs if the user gives a key. If not, use local TTS (macOS `say`, Piper, Kokoro). Do not install tools or spend API credit without asking.
- **Script first.** One claim per scene, 25 words or fewer of narration per scene, and the picture changes with every sentence.

## Slides and PPTX

Make slides only when asked (`/generate-slides`, `--slides`). Read `references/slides.md`. Export PPTX only on request or with `--pptx`: build the HTML deck first, then run `visual-explainer-pptx deck.html deck.pptx` (or `node ./pptx/export.mjs` from a checkout). Tell the user that HTML stays the source of truth. The PPTX has no animation, navigation, responsive layout, custom fonts, live diagrams, or JS.

## Images

Optional. If `surf` or another image tool is available, you can embed generated images as base64 for a hero or concept art. Never use images for data or structure. The page must work without them.

## Before delivery

```
□ one complete HTML file at the path; opens with no console errors
□ first viewport: main idea as a picture + one sentence
□ figures outnumber prose paragraphs
□ each figure: <figure> + "Fig. N" claim figcaption; role="img" + aria-label on the drawing (the SVG, or the Mermaid shell)
□ 2–4 key terms per figure linked with data-ref
□ no horizontal overflow at 1280px or 390px wide
□ both color schemes work (or one theme was deliberate)
□ type in rem; body ≥16px, labels ≥12px; all text ≥4.5:1 in both schemes; visible keyboard focus
□ headings state takeaways; no paragraph over 3 sentences
□ any Mermaid uses the zoom/pan shell
□ every size, gap, and radius is on the style-guide scale; polish pass done
□ register fonts and palette used exactly; would not pass for a generic dark/violet template
□ slides: each fits, nav chrome works, all source items covered, delivery check passes
```
