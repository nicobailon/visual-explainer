Use the canonical `visual-explainer` skill from `plugins/visual-explainer/`.

VS Code Copilot and Copilot CLI use this as custom instruction or rules guidance. They do not load a native visual-explainer skill, package, or plugin adapter from this repository.

For a VS Code workspace, copy these instructions into the project custom-instructions file, such as `.github/copilot-instructions.md`. For Copilot CLI, use them in the workspace instruction or rules setup supported by the installed CLI version.

When the user asks for a diagram, architecture overview, diff review, plan review, project recap, slide deck, or complex comparison table, read `plugins/visual-explainer/SKILL.md` and follow its workflow. Use the command markdown in `plugins/visual-explainer/commands/` as templates when helpful.

Write generated HTML to `~/.agent/diagrams/` unless the user asks for another path. Open it in a browser only when the environment permits it. If browser access is blocked, report the file path.
