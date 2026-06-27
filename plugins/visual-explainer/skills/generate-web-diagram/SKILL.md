---
name: generate-web-diagram
description: Generate a standalone HTML diagram and open it in the browser
disable-model-invocation: true
user-invocable: true
---

# generate-web-diagram

This is a user-invoked command wrapper skill. Load and follow the main visual-explainer skill before doing any work: `{baseDir}/../../SKILL.md`. Use the user's invocation arguments/request as the input; command-template harnesses may expose that input as `$@`.

Use the skill’s reference routing and final checklist. Pick a representation that fits the topic: Mermaid for connected flows/topologies; CSS cards for text-heavy explanations; tables for matrices; timelines for linear history.

Write to `~/.agent/diagrams/` with a descriptive filename and open the result in the browser. In Pi package installs, this is an explicit visual request: use `visual_explainer.prepare` when planning/context scouting helps, then `visual_explainer.render` with the complete HTML.
