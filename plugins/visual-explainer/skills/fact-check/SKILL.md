---
name: fact-check
description: Verify a generated document against actual code and git history
disable-model-invocation: true
user-invocable: true
---

# fact-check

This is a user-invoked command wrapper skill. Load and follow the main visual-explainer skill before doing any work: `{baseDir}/../../SKILL.md`. Use the user's invocation arguments/request as the input; command-template harnesses may expose that input as `$@`.

## Claim extraction

Read the target document. Extract verifiable claims about file paths, function/type/module names, behavior, architecture, data flow, APIs, commands, dependencies, tests, performance/security assertions, and git history. Skip subjective design opinions.

## Verification

For each claim, inspect the actual source or git history. Re-read referenced files. For diff reviews, compare before/after with `git show` or the relevant range. For plan docs, verify referenced files/functions/types exist and behave as described.

Classify claims as verified, corrected, unsupported, or unverifiable. Preserve the document’s structure. Correct factual errors in place and add a verification summary that lists what was checked and changed. For HTML, match the existing page style and open it in the browser. For markdown, report the path in chat.
