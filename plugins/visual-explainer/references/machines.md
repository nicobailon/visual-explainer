# State machines read from code

Read this when a page draws a state machine that lives in the user's code: a reducer, an XState config, a `transition()`. The render walks every state the code can reach and checks the drawing against the walk, so a forgotten state, an event that never fires, a dead end, or a rule the code breaks shows up on the page. A machine with no code to cite stays a hand-drawn replay (`motion.md`).

## The model

You place the states as `<ve-node>`s, as on any flow. The model is one more child; the render writes the arrows and the steps from the walk, so a flow with a model has no `<ve-edge>` and no `data-s`.

```html
<figure class="ve-steps">
  <ve-flow label="How playback and volume move together">
    <ve-node id="stopped-normal" at="1 1" sub="normal" key>Stopped</ve-node>
    <ve-node id="playing-normal" at="3 1" sub="normal">Playing</ve-node>
    <ve-node id="stopped-loud" at="1 2" sub="loud">Stopped</ve-node>
    <ve-node id="playing-loud" at="3 2" sub="loud">Playing</ve-node>
    <script type="text/plain" model>
      import { reduce } from "src/player.ts"
      init   = reduce(undefined, { type: "INIT" })
      events = {
        "you press play": s => reduce(s, { type: "PLAY" }),
        "you turn it up": s => reduce(s, { type: "VOL_UP" }),
        "the track ends": s => reduce(s, { type: "ENDED" }),
      }
      rules  = { "never loud while stopped": {
        holds: s => !(s.playback === "Stopped" && s.volume === "Loud"),
        fails: { playback: "Stopped", volume: "Loud" } } }
      state  = s => `${s.playback}-${s.volume}`.toLowerCase()
    </script>
  </ve-flow>
  <figcaption>…</figcaption>
</figure>
```

- **`import`** names files by their path from the repo root (the session's working directory; `--root` on the command line), never from the page. An `import … from` line naming a file outside the root, or one named like a secrets file, is refused. Node strips TypeScript types, so a `.ts` file works if every relative import in it has its real extension (`.ts`, not `.js`) and it uses no `enum`, `namespace`, parameter property, or path alias. Log with `console.error`, not to stdout.
- **`init`** is the first state, as plain data (objects, arrays, strings, numbers, booleans, `null`): the walk compares states as JSON.
- **`events`** maps each event, named in the reader's words, to the step it takes: `s => the next state`. A step that returns the same state draws no arrow.
- **`rules`** maps each rule, in the reader's words, to `{ holds, fails }`: `holds(s)` is true while the rule holds, and `fails` is a state it must reject. A rule that holds on its own `fails` state would pass on any machine, so it is an error.
- **`state`** maps a state to what draws it: a `ve-node` id for a flat chart, or an object of region → id for parallel parts (`<ve-region>`, below). An array of ids from the outermost state in (nested states) is drawn only by `auto`.

Write the four names as plain assignments (`init = …`), not `const`. Helpers in the script are fine.

**A step with I/O inside** (a fetch, a timer, a database write) cannot be imported and walked. Copy its logic as a hand model, and cite the code each step copies:

```js
init   = { playback: "Stopped", volume: "Normal" }
events = {
  "you press play": { when: s => s.playback === "Stopped", then: s => ({ ...s, playback: "Playing" }), at: "src/mixer.ts:42" },
}
```

`when` is optional (the step always applies without it); `at:"path:line"` is required and must exist. A model that imports no code may not use plain function events: there is nothing to cite.

The caption under the drawing says which proof the reader holds: "walked from `src/player.ts`" when every step is imported, "walked from a model of `src/mixer.ts`" when any step is copied.

**Parallel parts.** When `state` returns an object, such as `s => ({ playback: s.playback, volume: s.volume })`, each key is a `<ve-region>` holding the nodes of that part, and each value is the id of one of them, so values must differ across parts. Nodes keep their grid `at`, and the region draws a dashed boundary around them. Regions in adjacent rows fit; regions side by side need a free column between them for the labels of lifted arrows.

```html
<ve-region id="playback" label="Playback">
  <ve-node id="stopped" at="1 1" key>Stopped</ve-node>
  <ve-node id="playing" at="1 2">Playing</ve-node>
</ve-region>
<ve-region id="volume" label="Volume">…</ve-region>
```

A step draws one arrow in each part it changes. When every other node of a region takes the same event to one node (power off from anywhere), the arrows lift to one arrow out of the region's side and back in to that node, along the node's row; put that node at the end of its row, or the render warns. A mark goes to the parts of the marked state: if stopped and loud together break a rule, both Stopped and Loud are marked. The Page line counts whole states; the replay counts the nodes in each region.

## What the render does

It runs the model in a separate Node process with a 10 s limit, walks every state from `init` (at most 2000), and draws by `state()`. The arrows come from the walk; several events between the same two states share one arrow, labeled `play · resume`, so name events short and put states a column apart when an arrow carries several (the render warns when a label is wider than its gap).

In a `<figure class="ve-steps">` the walk replays: step k shows what k − 1 events reach (`1 state`, `3 states · 2 arrows`, …), and when a rule breaks, one last step lights the shortest path to it (`breaks “never loud while stopped” in 1 step: you turn it up`), or marks the first state alone when the rule already fails there (`breaks “…” at the start`). Leave out the `.ve-cap` captions, or the whole `.ve-player`, and the render writes them; captions you write must match the step count. One walked flow per stepper figure. The caption under the drawing, `walked from src/player.ts`, is written for you. In a plan, a flow with a model is a level-2 exhibit, drawn without the replay; place its states by hand, since `auto` draws only on a page.

**Too many states to place by hand:** write `<ve-flow auto label="…">` with only the model inside. The render lays out the whole walk itself (any size, nested states as boxes in boxes, each part of an object in its own box), with the same marks, as a static drawing with no replay. Labels are the `state()` ids, so return readable ones (`floor 3 · open`).

Marks on the drawing: `breaks` (a reachable state where a rule fails: red, dashed), `may-break` (a state from which one is reachable: amber, tinted), `bug-path` (a state or arrow on the shortest path to it: a thick accent line, lit on the replay's last step), and, with `auto`, a dead end (a state the code cannot leave (with a coarse `state()`, one of the states drawn as that node): dim, dashed).

The Page line gets one line per machine: `machine from src/player.ts · 4 states · 1 of 2 rules breaks in 1 step · 1 dead end · "you press mute" never fires`.

## Errors

Each names the line it is about (`line 12 <script>:` for the model) and stops the render.

| Error | Meaning |
|---|---|
| `import "src/x.ts": src/x.ts not found under <root>` | the path is not a file under the repo root |
| `an import cannot be found: …` / `src/v.ts:1 uses TypeScript that Node cannot strip …` | the imported code does not load as stripped TypeScript; fix it or write a hand model |
| `the model did not finish in 10 s; …` | a step that never returns, or an import that waits on I/O |
| `rule "…" cannot fail; it is not a rule` | `holds(fails)` is true |
| `the walk has more than 2000 states; model less (fewer events, or fewer fields in the state)` | states differ in fields the chart does not need; a coarser `state()` does not help, because the walk compares whole states |
| `event "…" throws at stopped-loud: …` / `rule "…" throws at …` | the step or rule fails on a state the walk reached |
| `event "…": at="src/mixer.ts:99", but src/mixer.ts has 60 lines` | a hand step cites a line that is not there |
| `the walk reached stopped-loud, which is not drawn` | add the node |
| `playing-muted is drawn, but no path from init reaches it` | remove it, or find the missing event |
| `the walk reached volume · loud, which is not drawn in region "volume"` | add the node inside that region |
| `loud is in no <ve-region>` / `region "sound" is not a part of state()` / `a <ve-region> … has none` | every node sits in the region of its part, and every region is a key of `state()` with nodes |
| `the walk has 20 states and 38 arrows, and 19 are not drawn; set auto, or model less` | 6 or more states nobody drew; one error instead of a line each |
| `auto draws the whole walk; remove the nodes, or drop auto` | `auto` lays out every state itself |

**Trust:** the model script is your own code, run as Node with your permissions, as the repo's tests are. The import check catches a wrong path, or a secrets-named file, in its `import … from` lines, nothing more; it is not a sandbox.

**MCP:** a model runs the repo's code, so the MCP server runs one only when it is started with `VISUAL_EXPLAINER_RUN_MODELS=1`; otherwise the model is an error that names the variable. Pi and the command line run models as they run the repo's tests.

## Judgement

- Agree the rules with the reader, in their words, before drawing. A rule nobody asked for proves nothing they care about.
- A broken rule stays on the page as a finding, with its path; never weaken the rule or the model until it passes.
- Say what the model leaves out (timers, retries, a second user, the network) in the caption or a note. A walk is complete only for the events it was given.
