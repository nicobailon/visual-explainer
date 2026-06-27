---
name: plan-review
description: Compare an implementation plan against the current codebase
disable-model-invocation: true
user-invocable: true
---

# plan-review

This is a user-invoked command wrapper skill. Load and follow the main visual-explainer skill before doing any work: `{baseDir}/../../SKILL.md`. Use the user's invocation arguments/request as the input; command-template harnesses may expose that input as `$@`.

## Inputs

Use `$@` as the plan path or plan text. If no path is given, ask for the plan.

## Data gathering before HTML

Read the plan in full. Extract goals, assumptions, proposed files/functions/types, migrations, tests, rollout/release notes, and explicit risks. Read every referenced file, plus importers/dependents that may be affected. Use ripgrep for existing patterns, similar implementations, public API boundaries, config/schema files, and tests.

## Source verification

For each proposed change, verify whether referenced files/functions/types exist, whether current behavior matches the plan, what ripple effects are missing, and whether the proposed test coverage fits the current test style. Cite plan sections and file:line evidence.

## Required page sections

1. Plan summary: problem, core idea, scope.
2. Accuracy verdict: correct, stale, risky, unsupported, missing.
3. Current architecture: diagram of affected subsystem only.
4. Proposed architecture: matching visual diff against current state.
5. Gap/risk matrix: correctness, tests, API, data model, UX, security/privacy, performance, maintainability, release.
6. File-by-file review: proposed edits, current reality, recommendation.
7. Better plan: concrete corrections or simplifications.
8. Decision: approve, revise, or reject with rationale.

Use current-vs-planned visual language. Include responsive nav. Follow the skill’s Mermaid, overflow, and evidence rules.

Write to `~/.agent/diagrams/` and open in browser.
