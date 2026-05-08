Use the canonical `visual-explainer` skill from `plugins/visual-explainer/`.

For Pi, prefer `pi install git:github.com/nicobailon/visual-explainer` or install a local checkout with `pi install ./visual-explainer`. The package metadata points to `./plugins/visual-explainer` for the skill and `./plugins/visual-explainer/commands` for prompts.

Do not keep the old manual installer copies alongside a package install. If you previously used `install-pi.sh`, remove `~/.pi/agent/skills/visual-explainer` and the copied `~/.pi/agent/prompts/{diff-review,fact-check,generate-slides,generate-visual-plan,generate-web-diagram,plan-review,project-recap,share-page}.md` files before relying on the package.

Activate with `$visual-explainer` or slash commands such as `/diff-review`, `/plan-review`, `/generate-web-diagram`, `/generate-slides`, and `/share-page` after restarting Pi. Generated pages go to `~/.agent/diagrams/` and should be opened with `scripts/open.sh`, which uses Pi's Glimpse native UI when available and falls back to the system browser.

Command templates are convenience prompts; the skill itself is the source of behavior. `/share-page` requires a Pi-compatible `vercel-deploy` skill, normally installed with `pi install npm:vercel-deploy`.
