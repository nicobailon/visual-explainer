---
name: diff-review
description: Generate a visual diff review for code changes
---

Load the visual-explainer skill and make a visual diff review.

Scope: read `$@` as a branch, commit, range, PR, or `HEAD`. If it is empty, compare the working tree with `main`/`master`. If it has `--quick`, remove the flag and follow the skill's Quick mode.

Gather before you draw: diff stats, name-status, the full changed files and the code paths around them, public API or type changes, tests, dependency or config changes, and commit messages. Every claim cites a path or `file:line`. Do not invent a rationale.

Typical sections; merge, reorder, drop, or add as the content needs:

| Section | Figure |
|---|---|
| Verdict | one sentence + merge/blocked chip + `+N −M · K files` |
| What changed | file map with added/modified/deleted chips and line counts |
| Behavior | before/after of the same SVG; edges added or removed are highlighted |
| Risks | severity-chip table: correctness, tests, API, security, performance |
| Coupling | small SVG of what depends on the changed code |
| Next | blockers and follow-ups as a checklist |

Colors: red = removed or before · green = added or after · amber = risk · blue = context. Deliver with the skill's rules.
