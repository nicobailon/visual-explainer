# Figures that move

Read this whenever a figure should change on the page: a stepper, a scene player, a replay, a live figure, or 3D. The drawing follows `diagrams.md`; the kit (`kit.md`) runs all of it.

## Stepper and scene player

Each step brings its parts forward with a one-line caption. With Play and a scrub bar it becomes a scene player.

```
<figure class="ve-steps">  parts: data-s="N" (appears at step N) · paths with pathLength="1" draw in
  .ve-player → ol.ve-cap > li[data-n="1/5"] · button[data-go=-1] · button[data-play] · input[type=range] · button[data-go=1]
```

Steps = the number of `li`; `data-s` counts from 1. It opens on the last step, the complete picture; Play replays from step 1. One claim per scene; something visibly changes at every step. Never autoplay.

## Replay: states and events

For a state machine, a workflow, or a reducer, each step is one event. The caption says what happened and why: `miss → fetch, because the TTL expired (cache.ts:48)`. The "because" is the guard or branch that fired: cite it, never invent it. Pick 6–12 events that carry one claim; show the other branch as a second stepper or small multiples. If the events come from a real run, say so in the figcaption.

A machine that lives in the user's code is not replayed by hand: its `<ve-flow>` model is walked, and the render writes the steps (`machines.md`).

`data-s` may list steps: a part appears at the first and lights on each; `0` draws it from the start. Draw the whole machine with `0` and let the run light its path. On a step, the edges that fired and the node's border light, and each token runs once. To light a route, give every edge on it the step and run one token along the joined `d`. The last step is the full picture.

```html
<path class="ve-e" data-s="0 3 5" d="M730 90H800"/>                                              <!-- drawn all along; lights on 3 and 5 -->
<g class="ve-co q" data-s="0 3 5" transform="translate(765 68)"><circle r="11"/><text>3</text></g>   <!-- its number, filled on 3 and 5 -->
<circle class="ve-tok" data-s="6" r="5" style="offset-path: path('M910 150V295H650V150'); --dur: 2200ms"/>   <!-- a route -->
<circle class="ve-tok" data-s="1" r="5" style="offset-path: path('M170 90H240'); --d: 130ms"/>   <!-- one of a burst -->
<g class="ve-at job" data-s="3 4" style="--d: 850ms"><rect x="217" y="72" width="26" height="26" rx="4"/><text x="230" y="85">J3</text></g>   <!-- .ve-at shows and hides it; .job is your own fill and stroke, over an empty slot you draw -->
<g class="ve-vals"><text class="sub" data-s="0" x="236" y="52">0 / 8</text><text class="sub" data-s="2" x="236" y="52">5 / 8</text></g>
```

- **Tokens** run under the nodes, entering each box and leaving from the far side; a token that lands in or leaves a slot goes after the nodes. `--dur` lengthens a run (900 ms default); `--d` delays it, so a burst is tokens about 150 ms apart.
- **Parts that come and go** (a queued job, a busy worker, the current state's ring) are `.ve-at` groups, shown only on the steps their `data-s` lists; a plain `data-s` part stays once it appears. Draw the empty slot underneath.
- **A changing value** (a count, a TTL, a state name) is one text per step at one spot inside `.ve-vals`, in step order.
- **A shared resource** (a worker pool, permits) is a dashed boundary (`.ve-bnd`) holding its slots (`rect.ve-slot`, `.is-on` when filled) and its count.
- **Kind labels:** `<text class="ve-kind">` above a node name: `fact`, `decision`, `state`, or `effect`. Number edges with `.ve-co.q` when captions refer to them.

## Live figure

Controls that recompute the picture, so the reader feels a setting: a TTL slider moves the hit rate, the dot split, and the headline. A policy toggle can show the bad rule giving a nicer, wrong number.

- One to three controls (`input[type=range]`, `button[aria-pressed]`), each changing something the reader cares about.
- One pure `model(settings)` feeds the figure, the numbers, and the sentence.
- Default to the real current value and mark it on the scale. Insert controls from JS and hide them in print, so print and no-JS show that state.
- Show the formula in the caption or a `<details>`; label a simplified model "illustrative". Model the concept; never copy production logic.

## 3D with three.js

Only when depth carries data: embeddings, physical or spatial layouts, stacks where height is a quantity, geometry. A graph of boxes and arrows is never 3D.

```html
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186/examples/jsm/"}}</script>
```

- Canvas in a `.frame` with a fixed aspect ratio, `role="img"`, an `aria-label`, a `Fig. N` caption, and a one-line text fallback with the key numbers.
- Colors from the page tokens via `getComputedStyle`; labels with `CSS2DRenderer`. One directional light plus ambient; no bloom, fog, or particles.
- `OrbitControls` with damping and zoom limits, plus "Reset view". Open on an angle that shows the answer; auto-rotate only until the first interaction, never under reduced motion.
- `setPixelRatio(Math.min(devicePixelRatio, 2))`, a `ResizeObserver`, and render only while visible.
