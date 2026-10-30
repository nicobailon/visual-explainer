---
name: compare
description: Compare two or more options side by side, recommend one, and let the reader pick in the page
---

Load the visual-explainer skill and make a comparison of: $@

`$@` is the options or the question. If it names no options, find the real ones in the code or the conversation.

Gather first: the facts that separate the options, each cited with `file:line` or a source. Every number comes from the source.

Use the skill's Comparison shape:

| Section | Figure |
|---|---|
| The difference | one drawing per option, side by side, marking the boxes and edges each adds or removes; options that change a state machine in the code each draw their walked machine, with the rules it breaks (`references/machines.md`) |
| Cases | the same mini diagram once per option, for each scenario that matters |
| Trade-offs | a table with ok/warn/risk chips, one row per criterion |
| Recommendation | the option you would pick and why |
| Pick | `<ve-ask id="pick" q="Which option?">`, one `<ve-opt>` per option, `default` on the recommended one |

Add another `<ve-ask>` only for a real sub-decision. Deliver with the skill's rules and hand over in one line. When the reply arrives, act on the pick within the original request; do not build unless the user asked for that.
