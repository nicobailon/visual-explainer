---
description: Generate a beautiful standalone HTML diagram and open it in the browser
---
Load the visual-explainer skill, then generate an HTML diagram for: $@

## Quick Mode (`--quick`)

Preserve the original mechanism by default. Only enter quick mode when the user includes the literal `--quick` flag in `$@`.

If `--quick` is present, do this first:
1. Remove `--quick` from the request text.
2. Read `./quick/README.md` for the JSON schema and optional rich fields.
3. Generate a **JSON spec** (not HTML) for the architecture renderer and save it to `/tmp/ve-quick-<timestamp>.json`.
4. Render HTML using:
   - `node $HOME/.pi/agent/skills/visual-explainer/quick/render-architecture.mjs /tmp/ve-quick-<timestamp>.json ~/.agent/diagrams/<descriptive-name>-quick.html`
5. If render succeeds, open the generated HTML in the browser and report the path.
6. If render fails OR the request is not a good fit for the architecture schema, automatically fall back to the original full HTML generation workflow below.

Without `--quick` (or after fallback), run the original mechanism unchanged.

Follow the visual-explainer skill workflow. Read the reference template and CSS patterns before generating. Pick a distinctive aesthetic that fits the content — vary fonts, palette, and layout style from previous diagrams.

If `surf` CLI is available (`which surf`), consider generating an AI illustration via `surf gemini --generate-image` when an image would genuinely enhance the page — a hero banner, conceptual illustration, or educational diagram that Mermaid can't express. Match the image style to the page's palette. Embed as base64 data URI. See css-patterns.md "Generated Images" for container styles. Skip images when the topic is purely structural or data-driven.

Write to `~/.agent/diagrams/` and open the result in the browser.
