---
name: project-recap
description: Generate a visual project recap for context switching
---

Load the visual-explainer skill and make a visual project recap for someone who is coming back to the project.

If `$@` has `--quick`, remove the flag and follow the skill's Quick mode. Otherwise `$@` can set the time window (for example `2w`).

Read the README, changelog, and package/build files, the top-level tree, `git status`, recent commits, open branches, TODOs in recently changed files, any progress or todo notes, and the main entry points. Cite command output or `file:line`. Do not invent momentum.

Typical sections; merge, reorder, drop, or add as the content needs:

| Section | Figure |
|---|---|
| What this is | one sentence + stack chips + entry points |
| Architecture | SVG of the main modules and the data flow between them |
| Recent activity | timeline grouped by theme, not a raw log |
| Current state | uncommitted work, branches, and blockers as status chips |
| Hot spots | modules ranked by churn and risk (bars) |
| Commands and files | compact reference table |
| Next | evidence-based next steps as a checklist |

Deliver with the skill's rules.
