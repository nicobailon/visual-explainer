Use the canonical `visual-explainer` skill from `plugins/visual-explainer/`.

For Codex CLI, copy the main skill to `~/.codex/skills/visual-explainer` and copy `plugins/visual-explainer/skills/*` to `~/.codex/skills/` for user-invoked command wrapper skills. If your Codex build supports prompt templates, you may also copy `plugins/visual-explainer/commands/*.md` to `~/.codex/prompts/`.

Activate by asking Codex to use `$visual-explainer` or the `visual-explainer` skill before generating diagrams, diff reviews, plan reviews, slide decks, or complex tables. Generated pages go to `~/.agent/diagrams/`; opening the browser may depend on Codex sandbox permissions.

Command-template support varies by Codex version. If prompts are unavailable, invoke the matching command wrapper skill (`diff-review`, `plan-review`, `generate-web-diagram`, etc.); wrappers load the main visual-explainer skill and are marked `disable-model-invocation: true`.
