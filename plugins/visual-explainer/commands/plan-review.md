---
name: plan-review
description: Compare an implementation plan against the current codebase
---

Load the visual-explainer skill and make a visual plan review.

Input: `$@` is a plan path or plan text. If it is empty, ask for the plan. If it has `--quick`, remove the flag and follow the skill's Quick mode.

Read the whole plan. Then read every file it references and the code that depends on those files. For each proposed change, check that the file, function, or type exists, that current behavior matches the plan, which ripple effects the plan misses, and whether its tests fit the repo style. Cite the plan section and `file:line`.

Typical sections; merge, reorder, drop, or add as the content needs:

| Section | Figure |
|---|---|
| Verdict | approve / revise / reject chip + one-sentence reason |
| Accuracy | claim table with correct / stale / risky / missing chips |
| Current vs planned | the same SVG twice; gaps marked in amber |
| Gaps and risks | area × severity matrix |
| File by file | table: planned → actual → recommendation |
| Better plan | the corrected sequence as a timeline |

Deliver with the skill's rules.
