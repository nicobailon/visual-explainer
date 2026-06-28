#!/usr/bin/env bash
# Managed-fork updater for visual-explainer.
#
# Keeps this fork (origin = your fork) in sync with the original project
# (upstream = nicobailon/visual-explainer) while preserving your own commits
# (favicon, house-style, local tweaks). On-demand by design — nothing here
# runs automatically; invoke it yourself or via the /update-visual-explainer
# command, which lets a pi agent resolve conflicts with full context.
#
# Exit codes (so an agent can branch on them):
#   0  = up to date OR update applied cleanly
#   10 = behind upstream (only with --check; no changes made)
#   20 = merge conflict — working tree left dirty for an agent to resolve
#   2  = precondition failure (dirty tree, missing remote, etc.)
#
# Usage:
#   update-fork.sh --check       # report status only, never modify
#   update-fork.sh --apply       # fetch, merge upstream, push, reinstall  (default)
#   update-fork.sh --continue    # after conflicts are resolved: commit, push, reinstall
set -euo pipefail

PKG="git:github.com/zereraz/visual-explainer"   # change if your fork lives elsewhere
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\033[1;33m• %s\033[0m\n' "$*"; }
err() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }

mode="${1:---apply}"

require_remotes() {
  git remote get-url origin   >/dev/null 2>&1 || { err "no 'origin' remote (your fork)"; exit 2; }
  git remote get-url upstream >/dev/null 2>&1 || {
    say "adding 'upstream' = nicobailon/visual-explainer"
    git remote add upstream git@github.com:nicobailon/visual-explainer.git
  }
}

reinstall() {
  if command -v pi >/dev/null 2>&1; then
    say "refreshing installed package via 'pi update'"
    pi update "$PKG" || pi install "$PKG"
    ok "package refreshed"
  else
    say "pi CLI not found — skipping reinstall (push is done; run 'pi update $PKG' later)"
  fi
}

case "$mode" in
  --check)
    require_remotes
    git fetch --quiet upstream main
    behind=$(git rev-list --count HEAD..upstream/main)
    ahead=$(git rev-list --count upstream/main..HEAD)
    if [ "$behind" -eq 0 ]; then
      ok "up to date with upstream (your fork is $ahead commit(s) ahead — your customizations)"
      exit 0
    fi
    say "behind upstream by $behind commit(s); your fork is $ahead ahead"
    git --no-pager log --oneline HEAD..upstream/main | sed 's/^/   upstream: /'
    exit 10
    ;;

  --apply)
    require_remotes
    if [ -n "$(git status --porcelain)" ]; then
      err "working tree is dirty — commit or stash first"; git status --short; exit 2
    fi
    branch="$(git branch --show-current)"
    [ "$branch" = "main" ] || { err "expected to be on 'main' (on '$branch')"; exit 2; }

    git fetch --quiet upstream main
    behind=$(git rev-list --count HEAD..upstream/main)
    if [ "$behind" -eq 0 ]; then ok "already up to date — nothing to do"; exit 0; fi

    say "merging upstream/main ($behind new commit(s)) into main, keeping your commits"
    if git merge --no-edit upstream/main; then
      ok "clean merge"
      git push origin main
      ok "pushed to your fork"
      reinstall
      exit 0
    else
      err "merge conflict — NOT pushing. Resolve, then run: $0 --continue"
      echo "conflicted files:"; git diff --name-only --diff-filter=U | sed 's/^/   /'
      exit 20
    fi
    ;;

  --continue)
    require_remotes
    if git diff --name-only --diff-filter=U | grep -q .; then
      err "unresolved conflicts remain:"; git diff --name-only --diff-filter=U | sed 's/^/   /'; exit 20
    fi
    say "committing resolved merge"
    git add -A
    git commit --no-edit || say "nothing to commit (merge may already be committed)"
    git push origin main
    ok "pushed to your fork"
    reinstall
    exit 0
    ;;

  *)
    err "unknown mode '$mode'"; grep -A12 '^# Usage:' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
