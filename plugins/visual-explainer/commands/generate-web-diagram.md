---
name: generate-web-diagram
description: Generate a standalone HTML diagram and open it in the browser
---

Load the visual-explainer skill and make a visual explanation of: $@

If `$@` has `--quick`, remove the flag and follow the skill's Quick mode.

1. Find the one sentence the reader must leave with. That sentence and its figure fill the first viewport.
2. Choose figures with the skill's table. Hand-drawn SVG first; Mermaid only when auto-layout pays. A process that unfolds gets a stepper.
3. Add sections only when each adds a figure. Prose stays as captions.

Deliver it with the skill's Deliver rules and run its checklist.
