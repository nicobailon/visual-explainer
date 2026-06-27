---
name: project-recap
description: Generate a visual project recap for context switching
disable-model-invocation: true
user-invocable: true
---

# project-recap

This is a user-invoked command wrapper skill. Load and follow the main visual-explainer skill before doing any work: `{baseDir}/../../SKILL.md`. Use the user's invocation arguments/request as the input; command-template harnesses may expose that input as `$@`.

## Data gathering before HTML

Read project identity files (`README`, changelog, package/build files), top-level tree, current git status, recent commits, unmerged/stale branches, TODO/FIXME in recent files, progress/todo memory if present, and key entry points/source files. Focus on what a returning developer needs to rebuild the mental model.

## Verify before generating

Cite command output or file:line evidence for project state, module/function/type names, recent activity, current blockers, and next-step claims. Do not fabricate momentum or rationale.

## Required page sections

1. Project identity: what this repo is, stack, entry points.
2. Architecture snapshot: Mermaid or hybrid diagram of current conceptual modules.
3. Recent activity: grouped narrative, not raw log.
4. Current state: uncommitted work, branches, TODOs, known blockers.
5. Mental model map: key modules, data flow, command/test/deploy paths.
6. Risks and cognitive debt: hotspots and gotchas.
7. Useful commands and files.
8. Likely next steps, based only on evidence.

Use responsive nav. Use compact reference tables for file maps and commands. Follow the skill’s Mermaid, overflow, and delivery rules.

Write to `~/.agent/diagrams/` and open in browser.
