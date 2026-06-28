---
name: update-visual-explainer
description: Sync this visual-explainer fork with upstream, preserving local customizations; an agent resolves any merge conflicts.
---

Update the managed `visual-explainer` fork. This is **on-demand** — only run because the user asked.

Managed clone location (try in order; use the first that exists):
- `~/Code/Zereraz/visual-explainer`
- the installed package dir: `~/.pi/agent/git/github.com/zereraz/visual-explainer`

Steps:

1. **Check first.** Run `bash scripts/update-fork.sh --check` from the managed clone.
   - Exit `0` → already up to date. Tell the user "already current (fork is N commits ahead with your customizations)" and stop.
   - Exit `10` → behind upstream; show the listed upstream commits, then continue.

2. **Apply.** Run `bash scripts/update-fork.sh --apply`.
   - Exit `0` → clean merge, pushed to the fork, and `pi update` refreshed the install. Report what upstream commits were merged and confirm the local customizations (favicon / house-style) survived. Done.
   - Exit `20` → **merge conflict**. Do NOT abandon. Resolve it:
     a. Read each conflicted file (`git diff --name-only --diff-filter=U`).
     b. For each conflict, **keep the intent of BOTH sides**: upstream's new behavior AND our customizations (the favicon injection in `extension.ts`, favicon lines in `templates/*.html` and `SKILL.md`, the KaTeX `&lt;` note). Our changes are additive — prefer integrating, not discarding.
     c. After resolving every file, run `bash scripts/update-fork.sh --continue` to commit, push, and reinstall.
   - Exit `2` → precondition failure (dirty tree / wrong branch). Read the message, fix it (commit/stash local work, or `git checkout main`), then retry.

3. **Verify** after success: confirm `grep -c ensureFavicon plugins/visual-explainer/extension.ts` is non-zero and the 4 templates still contain `rel="icon"`. If a customization was lost in the merge, re-apply it and amend.

Report concisely: what changed upstream, whether conflicts occurred, how they were resolved, and that customizations are intact. $@
