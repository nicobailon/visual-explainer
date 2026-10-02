---
name: fact-check
description: Verify a generated document against actual code and git history
---

Load the visual-explainer skill and fact-check the document at `$@`. If no path is given, use the newest HTML file in `~/.agent/diagrams/`.

1. Extract every claim that you can verify: paths, names, behavior, data flow, APIs, commands, dependencies, tests, numbers, and git history. Skip opinions.
2. Check each claim against the source or `git show`. Mark it verified, corrected, unsupported, or unverifiable.
3. Fix errors in place and keep the page's structure and style. Fix figures too: a wrong edge or label is a wrong claim.
4. Add a verification strip at the top: counts per status as chips, with a `<details>` list of what changed.

Reopen the HTML in the browser. For Markdown, report the path.
