Use the canonical `visual-explainer` skill from `plugins/visual-explainer/`.

OpenClaw support is lightweight rules guidance, not a native plugin adapter. Point the agent at `plugins/visual-explainer/SKILL.md` and ask it to follow that workflow when producing diagrams, visual reviews, slide decks, or complex tables. User-invoked command wrapper skills live under `plugins/visual-explainer/skills/` and are marked `disable-model-invocation: true`.

Generated pages should be written to `~/.agent/diagrams/` and opened in a browser when the environment allows it. If OpenClaw does not support command templates, invoke the matching command wrapper skill (`diff-review`, `plan-review`, `generate-web-diagram`, etc.) or read its `SKILL.md` under `plugins/visual-explainer/skills/`.
