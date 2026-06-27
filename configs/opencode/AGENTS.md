Use the canonical `visual-explainer` skill from `plugins/visual-explainer/`.

For OpenCode/opencode, the observed native skill path is `~/.config/opencode/skill/visual-explainer`. Copy `plugins/visual-explainer/skills/*` to `~/.config/opencode/skill/` for user-invoked command wrapper skills. Optional command templates may be copied to `~/.config/opencode/command/` if your build supports them.

Activate by asking OpenCode to use the `visual-explainer` skill for diagrams, architecture overviews, visual reviews, slide decks, and complex tables. Generated pages go to `~/.agent/diagrams/`; browser auto-open behavior depends on the harness and sandbox.

Command-template behavior is build-dependent. If commands are unavailable, invoke the matching wrapper skill (`diff-review`, `plan-review`, `generate-web-diagram`, etc.); wrappers load the main visual-explainer skill and are marked `disable-model-invocation: true`.
