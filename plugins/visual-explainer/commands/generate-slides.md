---
name: generate-slides
description: Generate a slide deck as a self-contained HTML page
---

Load the visual-explainer skill and make a slide deck for: $@

Read `./references/slides.md` and `./templates/slide-deck.html`. Inventory the source and map every item to a slide before you write HTML. Give most slides a figure, not bullets. Run the delivery check under reduced motion at the target size and at a short landscape size.

If `$@` has `--pptx`, remove the flag and follow the skill's PPTX rules. If the exporter is not installed, deliver the HTML deck and say what is missing.

Deliver with the skill's rules.
