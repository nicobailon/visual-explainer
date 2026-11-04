---
name: state-machine
description: Draw a state machine from the code itself, walk every state, and show each rule it breaks as a path to replay
---

Load the visual-explainer skill, read `references/machines.md`, and draw the state machine in `$@` (a file, a reducer, or a feature). With no argument, ask which machine.

1. Gather: find the step (a reducer, an XState config, a `transition()`), the shape of its state, and every event that reaches it. Cite each with `file:line`.
2. Model: import the step from the repo. Copy a step as a hand model (`when`, `then`, `at:`) only when it does I/O, and say which steps are copied.
3. Rules: before drawing, propose 1–3 rules in the user's words, each with the state it must reject, and agree them in the chat.
4. Render. Fix every ✗, then read the machine's Page line: states, broken rules, dead ends, events that never fire. Place up to about 12 states by hand; past that, use `auto`.
5. Prove each broken rule against the real code: replay its path (the last replay caption lists the events) as a one-line script or a test file the user can keep, and run it. The replay shows the rule that breaks soonest; to see another rule's path, render with that rule alone. A path that does not reproduce is a bug in the model: fix the model, never the rule.
6. Hand off one line per broken rule (the rule, the path, the test), the dead ends and events that never fire, and what the model leaves out (timers, retries, a second user, the network).
