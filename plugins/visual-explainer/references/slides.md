# Slides

Slides are a different medium, not a long page cut into pieces. Make them only when asked. Copy the engine in `templates/slide-deck.html` as it is: chrome, `SlideEngine`, `autoFit()`, and the delivery check. Restyle everything else.

## Plan before HTML

```
source ──► inventory every item ──► map item → slide ──► pick composition ──► write
           (sections, rows,         (nothing unmapped;    (vary: centered, left,
            decisions, details)      add slides, never     right, split, bleed)
                                     drop content)
```

A source with 7 sections usually needs 18–25 slides, not 10. Test: a reader who has never seen the source can rebuild every major point from the deck.

## Budget per slide (one `100dvh`, no scrolling)

| Type | Holds at most |
|---|---|
| Title / Full-bleed | heading + subtitle |
| Divider | number + heading + subhead |
| Content | heading + 5 bullets of ≤2 lines, or heading + one figure |
| Split | two panels, each within its own type's limits |
| Diagram | heading + one SVG figure (≤ 10 boxes, 18px+ labels, 2px+ edges) |
| Dashboard | heading + 6 KPIs; hero value ≤ 6 characters |
| Table | heading + 8 rows; continue on the next slide |
| Code | heading + 10 lines |
| Quote | ≤ 25 words + attribution |

- One focal point per slide. The heading states the slide's takeaway. Body text 18px or larger, in the sans; keep the display face for headings. Contrast higher than on pages.
- Prefer a figure to bullets. A slide with only bullets should be the exception.
- Never put three centered slides in a row.
- Keep type in `clamp(px, vw, px)`, not `rem`. Reduce padding and hide decoration at `max-height: 700/600/500px`.

## Engine contract (already in the template)

Progress bar · dot rail that expands to titles on hover or focus · `4 / 12 · 33%` counter · arrow, Space, Home, End, `O` outline, `?` help, Esc · `#slide-N` deep links (a hash beats resume) · `localStorage` resume · touch swipe · no slide navigation while focus is in `.diagram-shell`, `.table-scroll`, `.code-scroll`, or a form field. Entrance states hide behind `.js`, so the deck still reads without JS.

## Delivery check

`overflow:hidden` clips silently, so a clipped slide does not prove that the content fits. Before you ship:

1. Turn on `prefers-reduced-motion: reduce`. In Chrome DevTools: Rendering → Emulate CSS media feature.
2. Load the deck at the target size and at a short landscape size (about 1280×600).
3. The template marks each failing slide with a red (overflow) or amber (autoFit used) outline and logs `Slide delivery check failed`.
4. Split or cut the content until the console reports `passed`.

## PPTX

`visual-explainer-pptx deck.html deck.pptx` reads each `section.slide`: its headings, `.slide__subtitle`, lists, paragraphs, tables, and `pre`. Keep that structure semantic so the export has content to read.
