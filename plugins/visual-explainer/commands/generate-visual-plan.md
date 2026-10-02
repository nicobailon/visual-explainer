---
name: generate-visual-plan
description: Generate a visual implementation plan
---

Load the visual-explainer skill and make a visual implementation plan for: $@

Research first: entry points, affected modules, public APIs, data model and config, tests, similar features, and README/CHANGELOG constraints. Cite `file:line`.

Typical sections; merge, reorder, drop, or add as the content needs:

| Section | Figure |
|---|---|
| Goal and scope | one-sentence goal + in/out columns |
| Current → proposed | the same SVG drawn twice (or a toggle): changed boxes and edges highlighted |
| Sequence | phase timeline with dependencies |
| File map | tree with create/edit/delete chips |
| Contracts | types, APIs, flags, and events as compact code cards |
| Risks | matrix: area × severity chips |
| Tests | table: behavior → test file → layer |
| Done when | checklist of observable results |

The proposed design dominates. Put reference detail in `<details>`. Deliver with the skill's rules.
