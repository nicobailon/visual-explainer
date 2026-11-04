---
name: project-recap
description: Generate a visual project recap for context switching
---

Load the visual-explainer skill and make a visual project recap for someone who is coming back to the project.

`$@` can set the time window (for example `2w`).

Read the README, changelog, and package/build files, the top-level tree, `git status`, recent commits, open branches, TODOs in recently changed files, any progress or todo notes, and the main entry points. Cite command output or `file:line`. Do not invent momentum.

Typical sections; merge, reorder, drop, or add as the content needs:

| Section | Figure |
|---|---|
| What this is | one sentence + stack chips + entry points |
| Architecture | SVG of the main modules and the data flow between them |
| Recent activity | timeline grouped by theme, not a raw log |
| Current state | uncommitted work, branches, and blockers as status chips |
| Hot spots | `<ve-bars>` of commits or lines changed per module, the riskiest marked `hot` |
| Commands and files | compact reference table |
| Next | `<ve-ask id="next" q="Where do we start?">` with one `<ve-opt>` per evidence-based next step; the best one carries `default` |

Deliver with the skill's rules and hand over in one line. When the reply arrives, start on the step the reader picked.
