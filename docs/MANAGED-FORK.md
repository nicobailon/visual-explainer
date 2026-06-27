# Managed fork workflow

This is a **managed fork** of `nicobailon/visual-explainer`. It carries local
customizations (a standard self-contained favicon, house-style notes) on top of
upstream, and stays updatable.

## Philosophy: control over automatic

Updates are **on-demand, not automatic**. Nothing pulls upstream behind your
back — so your local modifications and pinned behavior are never disturbed by a
surprise merge. When you *do* want to update, it's one command, and a pi agent
resolves any conflicts with full repository context.

If a session is already current, everything just loads normally with zero work.

## Remotes

| Remote     | Points at                          | Role                         |
|------------|------------------------------------|------------------------------|
| `origin`   | `zereraz/visual-explainer`         | your fork (your commits)     |
| `upstream` | `nicobailon/visual-explainer`      | the original project         |

## Updating

From this clone (`~/Code/Zereraz/visual-explainer`):

```bash
bash scripts/update-fork.sh --check     # status only; never modifies
bash scripts/update-fork.sh --apply     # fetch + merge upstream + push + pi update
# if conflicts (exit 20): resolve files, then:
bash scripts/update-fork.sh --continue
```

Or, inside pi, just run the command (loaded with this plugin):

```
/update-visual-explainer
```

The command checks first, applies if behind, and if a merge conflict occurs the
agent resolves it — **keeping both** upstream's new behavior and our additive
customizations — then commits, pushes, and refreshes the install.

## Making your own changes

Commit directly on `main` (small tweaks) or via a feature branch + PR to your
own fork. Because our changes are additive, upstream merges are usually clean.
`scripts/update-fork.sh` verifies the favicon customizations survived each update.
