Use the canonical `visual-explainer` skill from `plugins/visual-explainer/`.

OpenClaw support is lightweight rules guidance, not a native plugin adapter. Point the agent at `plugins/visual-explainer/SKILL.md` and ask it to follow that workflow when producing diagrams, visual reviews, slide decks, or complex tables.

Generated pages should be written to `~/.agents/diagrams/` and opened in a browser when the environment allows it. If OpenClaw does not support command templates, read the matching file under `plugins/visual-explainer/commands/` and execute its instructions manually.
