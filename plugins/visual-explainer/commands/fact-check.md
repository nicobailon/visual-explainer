---
name: fact-check
description: Verify a generated document against actual code and git history
---

Load the visual-explainer skill and fact-check the document at `$@`. With no path, use the newest HTML page excluding `.src.html`. Native Pi: call `visual_explainer` `prepare` with `topic: "Fact-check"` and `preferSubagent: false`, then search its `outputDir`; do not read project settings directly. Elsewhere: use nonblank `VISUAL_EXPLAINER_OUTPUT_DIR` (relative to the working directory), else `~/.agent/diagrams/`.

1. Extract every claim that you can verify: paths, names, behavior, data flow, APIs, commands, dependencies, tests, numbers, and git history. Skip opinions.
2. Check each claim against the source or `git show`. Mark it verified, corrected, unsupported, or unverifiable.
3. Fix errors with small edits to the page's source (`<name>.src.html` when it exists, else the HTML) and render again; keep its structure and style. A wrong edge or label is a wrong claim too.
4. Add a verification strip at the top: counts per status as chips, with a `<details>` list of what changed.

Open the result; for Markdown, report the path.
