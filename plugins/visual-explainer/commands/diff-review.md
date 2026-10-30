---
name: diff-review
description: Generate a visual diff review for code changes, with each fix to accept or leave in the page
---

Load the visual-explainer skill and make a visual diff review.

Scope: read `$@` as a branch, commit, range, PR, or `HEAD`. If it is empty, compare the working tree with `main`/`master`.

Gather before you draw: diff stats, name-status, the full changed files and the code paths around them, public API or type changes, tests, dependency or config changes, and commit messages. Every claim cites a path or `file:line`. Do not invent a rationale.

Typical sections; merge, reorder, drop, or add as the content needs:

| Section | Figure |
|---|---|
| Verdict | one sentence + merge/blocked chip + `<ve-stack>` of lines added and removed |
| What changed | file map with added/modified/deleted chips; `<ve-bars>` of lines per file |
| Behavior | before/after of the same SVG, edges added or removed highlighted; a changed state machine or queue replays one event per step (`references/motion.md`); a machine read from code is walked before and after, showing a rule the diff newly breaks or a state it makes unreachable (`references/machines.md`) |
| Risks | severity-chip table: correctness, tests, API, security, performance |
| Coupling | small SVG of what depends on the changed code |
| Fixes | each risk worth acting on: `<ve-ask id="r1" q="Fix the unchecked null in parse()?">` (then `r2`, …; the risk in a few words) with `<ve-opt value="fix" default note="the fix in one line">Fix</ve-opt>` and `<ve-opt value="leave">Leave as is</ve-opt>` |

Colors: red = removed or before · green = added or after · amber = risk · blue = context. Deliver with the skill's rules and hand over in one line.

When the reply arrives: on a branch the user owns, apply the fixes they accepted. On someone else's PR, draft review comments for them and do not post them.
