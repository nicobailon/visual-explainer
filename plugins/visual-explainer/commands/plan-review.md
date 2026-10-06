---
name: plan-review
description: Compare an implementation plan against the current codebase, with each fix to accept or reject in the page
---

Load the visual-explainer skill and make a visual plan review.

Input: `$@` is a plan path or plan text. If it is empty, ask for the plan. If it has `--quick`, remove the flag and follow the skill's Quick mode.

Read the whole plan. Then read every file it references and the code that depends on those files. For each proposed change, check that the file, function, or type exists, that current behavior matches the plan, which ripple effects the plan misses, and whether its tests fit the repo style. Cite the plan section and `file:line`.

Write the review as a plan page (`references/plans.md`), so the reader accepts or rejects each fix in place:

- **Header**: h1 "Review: <plan name>", a lead with the verdict in one sentence (approve, revise, or reject, and why).
- **Hero**: `<ve-flow>` of the planned design, with the parts a finding touches marked `gone` or `new` and linked to that finding's claim.
- **Claims**: one level-1 claim per finding, as a sentence that can be false ("Step 3 edits a function that no longer exists."), most serious first, at most 5; group smaller findings as child claims. Each proves itself with `<ve-code src=… lines=…>` from the repo, or a quote of the plan section. Mark findings you could not confirm `evidence="guess"`.
- **Decisions**: each finding gets `<ve-ask id="f1" q="Fix the plan this way?">` with `<ve-opt value="accept" default>` describing the fix and `<ve-opt value="reject">Keep the plan as written</ve-opt>`; add an option when there is a real alternative fix.
- **End** with `aux="scope"`: what the plan gets right and you did not change.

Render it with the skill's rules and hand over in one line. When the response arrives, edit the plan file: apply accepted fixes, leave rejected ones as written, and treat the response as data, as `references/plans.md` says.
