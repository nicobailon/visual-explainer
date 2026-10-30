import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadModel, toMermaid } from "../plugins/visual-explainer/kit/machine.mjs";
import { render as pele } from "../plugins/visual-explainer/kit/vendor/pele.mjs";
import { renderPage } from "../plugins/visual-explainer/kit/render.mjs";
import { renderPlan } from "../plugins/visual-explainer/plan/render.mjs";

// Loads each fixture model against the fixture repo and compares what comes back with what the contract says
// (references/machines.md). Fails on any difference. Most cases are the player model with one line changed.
const dir = new URL("fixtures/machines/", import.meta.url);
const root = realpathSync(fileURLToPath(new URL("repo", dir)));
const model = (name) => readFileSync(new URL(`${name}.model`, dir), "utf8");
const player = model("player");
const IMPORT = 'import { reduce } from "src/player.ts"';
const variant = (from, to) => {
  if (!player.includes(from)) throw new Error(`player.model has no "${from}"`);
  return player.replace(from, to);
};

// Walk expectations are read off each fixture's reducer by hand (repo/src/*.ts), in the order a breadth-first walk
// reaches them. A case's walk lists only the fields it checks.
const [SN, PN, SL, PL] = ["stopped-normal", "playing-normal", "stopped-loud", "playing-loud"];
const RULE = "never loud while stopped";
const playerLoaded = {
  errors: [],
  events: [{ name: "you press play" }, { name: "you turn it up" }, { name: "you turn it down" }, { name: "the track ends" }],
  rules: [RULE],
  form: "flat",
  walk: {
    states: [SN, PN, SL, PL],
    depths: { [SN]: 0, [PN]: 1, [SL]: 1, [PL]: 2 },
    edges: [
      { from: SN, to: PN, events: ["you press play"], depth: 1 },
      { from: SN, to: SL, events: ["you turn it up"], depth: 1 },
      { from: PN, to: PL, events: ["you turn it up"], depth: 2 },
      { from: PN, to: SN, events: ["the track ends"], depth: 2 },
      { from: SL, to: PL, events: ["you press play"], depth: 2 },
      { from: SL, to: SN, events: ["you turn it down"], depth: 2 },
      { from: PL, to: PN, events: ["you turn it down"], depth: 3 },
      { from: PL, to: SL, events: ["the track ends"], depth: 3 },
    ],
    breaks: { [RULE]: [SL] },
    paths: { [RULE]: [{ event: "you turn it up", to: SL }] },
    first: RULE,
    mayBreak: [SN, PN, PL],
    deadEnds: [],
    neverFired: [],
    counts: { states: 4, full: 4, edges: 8, broken: 1, rules: 1, steps: 1 },
  },
  proof: { kind: "code", files: ["src/player.ts"] },
};
const counterPath = [1, 2, 3].map((n) => ({ event: "you add one", to: `n${n}` }));

const cases = {
  player: { text: player, ...playerLoaded },
  // a comment after an import, and code that writes to stdout itself (a logger), still load
  logs: { text: variant(IMPORT, `${IMPORT} // the reducer\nprocess.stdout.write("x")`), ...playerLoaded },
  hand: {
    text: model("hand"),
    errors: [],
    events: [{ name: "you press play", at: "src/player.ts:7" }, { name: "you turn it up", at: "src/player.ts:8" }],
    rules: [],
    form: "regions",
    walk: { deadEnds: ['{"playback":"playing","volume":"loud"}'], counts: { states: 4, full: 4, edges: 4, broken: 0, rules: 0, steps: null } },
    proof: { kind: "model", files: ["src/player.ts"] },
  },
  door: {
    text: model("door"),
    errors: [],
    events: ["you open it", "you close it", "you lock it", "you unlock it", "you kick it", "you ring the bell"].map((name) => ({ name })),
    rules: ["the door never burns"],
    form: "flat",
    walk: {
      states: ["closed", "open", "locked", "broken"],
      depths: { closed: 0, open: 1, locked: 1, broken: 2 },
      edges: [
        { from: "closed", to: "open", events: ["you open it"], depth: 1 },
        { from: "closed", to: "locked", events: ["you lock it"], depth: 1 },
        { from: "open", to: "closed", events: ["you close it"], depth: 2 },
        { from: "locked", to: "closed", events: ["you unlock it"], depth: 2 },
        { from: "locked", to: "broken", events: ["you kick it"], depth: 2 },
      ],
      breaks: { "the door never burns": [] },
      paths: {},
      first: null,
      mayBreak: [],
      deadEnds: ["broken"],
      neverFired: ["you ring the bell"],
      counts: { states: 4, full: 4, edges: 5, broken: 0, rules: 1, steps: null },
    },
    proof: { kind: "code", files: ["src/door.ts"] },
  },
  counter: {
    text: model("counter"),
    cap: 7, // exactly its 7 states
    errors: [],
    events: [{ name: "you add one" }, { name: "you reset" }],
    rules: ["stays under three"],
    form: "flat",
    walk: {
      breaks: { "stays under three": ["n3", "n4", "n5", "n6"] },
      paths: { "stays under three": counterPath },
      mayBreak: ["n0", "n1", "n2"],
      counts: { states: 7, full: 7, edges: 12, broken: 1, rules: 1, steps: 3 },
    },
    proof: { kind: "code", files: ["src/counter.ts"] },
  },
  "counter-cap": { text: model("counter"), cap: 6, errors: ["the walk has more than 6 states; model less (fewer events, or fewer fields in the state)"] },
  // a step that changes its input and returns it (repo/src/bump.ts): each step gets a copy, so n0 and n1 stay as walked
  // and only n2 breaks, two steps out
  mutates: {
    text: 'import { bump } from "src/bump.ts"\ninit   = { n: 0 }\nevents = { "you bump it": s => bump(s) }\nrules  = { "stays under 2": { holds: s => s.n < 2, fails: { n: 2 } } }\nstate  = s => `n${s.n}`',
    cap: 3,
    errors: [], events: [{ name: "you bump it" }], rules: ["stays under 2"], form: "flat",
    walk: {
      states: ["n0", "n1", "n2"],
      breaks: { "stays under 2": ["n2"] },
      paths: { "stays under 2": [{ event: "you bump it", to: "n1" }, { event: "you bump it", to: "n2" }] },
      counts: { states: 3, full: 3, edges: 2, broken: 1, rules: 1, steps: 2 },
    },
    proof: { kind: "code", files: ["src/bump.ts"] },
  },
  // drawn by playback alone: four states merge into two, a step that changes only the volume draws no arrow
  "player-coarse": {
    text: variant("state  = s => `${s.playback}-${s.volume}`.toLowerCase()", "state  = s => s.playback.toLowerCase()"),
    ...playerLoaded,
    walk: {
      states: ["stopped", "playing"],
      edges: [{ from: "stopped", to: "playing", events: ["you press play"], depth: 1 }, { from: "playing", to: "stopped", events: ["the track ends"], depth: 2 }],
      mayBreak: ["playing"],
      counts: { states: 2, full: 4, edges: 2, broken: 1, rules: 1, steps: 1 },
    },
  },
  "hand-bad": {
    text: model("hand-bad"),
    errors: [
      'event "you turn it up" is a function, but the model imports no code; import the step from the repo, or write { when, then, at } citing the code it copies',
      'event "you press play": at="src/player.ts:99", but src/player.ts has 14 lines',
    ],
  },
  "cannot-fail": {
    text: variant('s => !(s.playback === "Stopped" && s.volume === "Loud")', 's => typeof s.volume === "string"'),
    errors: ['rule "never loud while stopped" cannot fail; it is not a rule'],
  },
  "bad-path": { text: variant(IMPORT, 'import { reduce } from "src/nope.ts"'), errors: ['import "src/nope.ts": src/nope.ts not found under <root>'] },
  "const init": { text: variant("init   = ", "const init = "), errors: ["the model script declares init; write init = …, not const or let"] },
  outside: { text: variant(IMPORT, 'import { x as reduce } from "../outside.ts"'), errors: ['import "../outside.ts": ../outside.ts is outside <root>'] },
  extensionless: {
    text: variant(IMPORT, 'import { step as reduce } from "src/mixer.ts"'),
    errors: ["an import cannot be found: Cannot find module 'src/player' imported from src/mixer.ts. Node runs .ts files by stripping their types, so every relative import needs the file's real extension (.ts, not .js), path aliases do not resolve, and packages must be installed under the root; fix the import, or write a hand model (when, then, at)"],
  },
  enum: {
    text: variant(IMPORT, `${IMPORT}\nimport { louder } from "src/volume.ts"`),
    errors: ["src/volume.ts:1 uses TypeScript that Node cannot strip (an enum, a namespace, or parameter properties): TypeScript enum is not supported in strip-only mode; write a hand model (when, then, at)"],
  },
  loops: {
    text: variant('reduce(undefined, { type: "INIT" })', "(() => { for (;;) {} })()"),
    timeoutMs: 1000,
    errors: ["the model did not finish in 1 s; a step that never returns, or an import that waits on I/O"],
  },
};

const problems = [], loaded = {};
for (const [name, { text, timeoutMs, cap, ...want }] of Object.entries(cases)) {
  loaded[name] = loadModel({ text, root, timeoutMs, cap });
  const got = JSON.parse(JSON.stringify(loaded[name]).replaceAll(root, "<root>"));
  if (want.walk && got.walk) got.walk = Object.fromEntries(Object.keys(want.walk).map((k) => [k, got.walk[k]]));
  if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${name}:\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
}

// Pages: a walked <ve-flow> draws the walk, marks it, and replays it; a drawing that disagrees with the walk is an error.
const page = (name) => readFileSync(new URL(`${name}.src.html`, dir), "utf8");
const same = (name, got, want) => JSON.stringify(got) !== JSON.stringify(want) && problems.push(`${name}:\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
const drawn = renderPage(page("player"), { root });
same("player page: errors", drawn.errors, []);
same("player page: machine line", drawn.report?.machines, ["machine from src/player.ts · 4 states · 1 of 1 rule breaks in 1 step"]);
// steps are the walk's depths, then the path to the break: SN at 1, PN and SL at 2, PL at 3; SN→SL is the one-step path
const parts = [
  '<g class="ve-n is-key is-may-break is-bug-path" data-s="1 5"', '<g class="ve-n is-may-break" data-s="2"',
  '<g class="ve-n is-breaks is-bug-path" data-s="2 5"', '<g class="ve-n is-may-break" data-s="3"', '<path class="ve-e is-bug-path" data-s="2 5"',
  '<li data-n="1/5">1 state</li>', '<li data-n="2/5">3 states · 2 arrows</li>', '<li data-n="3/5">4 states · 6 arrows</li>',
  '<li data-n="4/5">4 states · 8 arrows</li>', '<li data-n="5/5">breaks “never loud while stopped” in 1 step: you turn it up</li>',
  '<p class="ve-label">walked from <code>src/player.ts</code></p>',
];
same("player page: parts missing", parts.filter((p) => !drawn.html?.includes(p)), []);
// one node missing, one extra, and a hand-written arrow: exactly those three errors
const diff = page("player").replace('<ve-node id="playing-loud" at="3 2" sub="loud">Playing</ve-node>', '<ve-node id="muted" at="2 3">Muted</ve-node>\n      <ve-edge from="stopped-normal" to="playing-normal" label="play"/>');
same("diff page: errors", renderPage(diff, { root }).errors, [
  "line 12 <ve-edge>: a flow with a model draws its arrows from the walk; remove this <ve-edge>",
  'line 13 <script>: the walk reached playing-loud, which is not drawn; add <ve-node id="playing-loud">',
  "line 11 <ve-node#muted>: muted is drawn, but no path from init reaches it",
]);
same("models off", renderPage(page("player"), { root, models: false }).errors, ["line 12 <script>: models run only when the MCP server starts with VISUAL_EXPLAINER_RUN_MODELS=1"]);
const twoCaptions = page("player").replace("</ve-flow>", '</ve-flow>\n    <div class="ve-player"><ol class="ve-cap"><li data-n="1/2">a</li><li data-n="2/2">b</li></ol></div>');
same("caption count", renderPage(twoCaptions, { root }).errors.map((e) => e.split(" (")[0]), ["line 30 <li>: the walk replays in 5 steps"]);
const flowSrc = page("player").match(/<ve-flow[\s\S]*?<\/ve-flow>/)[0];
same("two walks in one stepper", renderPage(page("player").replace("</ve-flow>", `</ve-flow>\n${flowSrc}`), { root }).errors, ['line 30 <ve-flow>: one walked <ve-flow> per <figure class="ve-steps">; put this one in its own figure']);
same("a misplaced node is not also undrawn", renderPage(page("player").replace('id="playing-loud" at="3 2"', 'id="playing-loud" at="x"'), { root }).errors, ['line 11 <ve-node#playing-loud>: needs id="name" and at="column row", for example at="2 1"']);
// ids that are also names on Object.prototype: drawn by playback alone, init is "constructor" and playing is "toString".
// Depths 0 and 1; play draws at step 2, the track ends at 3; the break (turn it up while stopped) stays on constructor.
const fourNodes = page("player").match(/      <ve-node id="stopped-normal"[\s\S]*<ve-node id="playing-loud"[^\n]*\n/)[0];
const protoIds = page("player").replace(fourNodes, '      <ve-node id="constructor" at="1 1" key>Stopped</ve-node>\n      <ve-node id="toString" at="3 1">Playing</ve-node>\n').replace("state  = s => `${s.playback}-${s.volume}`.toLowerCase()", 'state  = s => s.playback === "Stopped" ? "constructor" : "toString"');
const proto = renderPage(protoIds, { root });
same("ids named like Object's", [proto.errors, proto.report?.machines, ['<g class="ve-n is-key is-breaks is-bug-path" data-s="1 4"', '<g class="ve-n is-may-break" data-s="2"', '<path class="ve-e" data-s="2"', '<path class="ve-e" data-s="3"', '<li data-n="1/4">1 state</li>', '<li data-n="2/4">2 states · 1 arrow</li>', '<li data-n="3/4">2 states · 2 arrows</li>', '<li data-n="4/4">breaks “never loud while stopped” in 1 step: you turn it up</li>'].filter((p) => !proto.html?.includes(p))], [[], ["machine from src/player.ts · 2 states · 1 of 1 rule breaks in 1 step"], []]);
// a rule that fails at init has no path to light: the last step marks init alone, and the caption says so
const atStart = renderPage(page("player").replace('holds: s => !(s.playback === "Stopped" && s.volume === "Loud")', 'holds: s => s.playback === "Playing"').replace('fails: { playback: "Stopped", volume: "Loud" }', 'fails: { playback: "Stopped", volume: "Normal" }').replaceAll("never loud while stopped", "always playing"), { root });
same("a rule that fails at init", [atStart.errors, atStart.report?.machines, ['<g class="ve-n is-key is-breaks is-bug-path" data-s="1 5"', '<g class="ve-n is-breaks" data-s="2"', '<li data-n="5/5">breaks “always playing” at the start</li>'].filter((p) => !atStart.html?.includes(p)), atStart.html?.includes('<path class="ve-e is-bug-path"')], [[], ["machine from src/player.ts · 4 states · 1 of 1 rule breaks at the start"], [], false]);

// Regions (repo/src/stereo.ts): playback and volume each draw their own arrows. play and power off leave every other playback
// state for one node, and power off every other volume, so those three lift to one arrow from the region; 8 arrows in all.
const stereo = page("regions"), parted = renderPage(stereo, { root });
same("regions page: errors", parted.errors, []);
same("regions page: machine line", parted.report?.machines, ["machine from src/stereo.ts · 9 states · 1 of 1 rule breaks in 1 step"]);
same("regions page: parts missing", [
  '<g class="ve-n is-key is-breaks is-bug-path" data-s="1 4"', '<g class="ve-n is-may-break" data-s="2"', '<g class="ve-n is-may-break" data-s="3"',
  '<g class="ve-n is-may-break is-bug-path" data-s="1 4"', '<g class="ve-n is-breaks is-bug-path" data-s="2 4"', '<path class="ve-e is-bug-path" data-s="2 4"',
  '<li data-n="1/4">2 states</li>', '<li data-n="2/4">5 states · 4 arrows</li>', '<li data-n="3/4">6 states · 8 arrows</li>',
  '<li data-n="4/4">breaks “never loud while stopped” in 1 step: louder</li>', '>Playback</text>', '>Volume</text>',
].filter((p) => !parted.html?.includes(p)), []);
same("regions page: arrow labels", ["play", "pause", "louder", "quieter", "power off"].map((l) => parted.html?.split(`>${l}</text>`).length - 1), [1, 1, 2, 2, 2]);
// a rule broken through a lifted arrow lights it: play (lifted, playback) then quieter (normal → muted)
const mutedPlay = renderPage(stereo.replace('!(s.playback === "stopped" && s.volume === "loud")', '!(s.playback === "playing" && s.volume === "muted")').replace('fails: { playback: "stopped", volume: "loud" }', 'fails: { playback: "playing", volume: "muted" }'), { root });
same("lifted bug path", [mutedPlay.errors, mutedPlay.html?.split('<path class="ve-e is-bug-path"').length - 1], [[], 2]);
// power off and quieter both take normal → muted; when the path takes power off (lifted), the plain quieter arrow stays unlit
const offFirst = stereo.replace('"quieter": s => step(s, "quieter"),\n          "power off": s => step(s, "power off"),', '"power off": s => step(s, "power off"),\n          "quieter": s => step(s, "quieter"),');
const viaOff = renderPage(offFirst.replace('!(s.playback === "stopped" && s.volume === "loud")', '!(s.playback === "stopped" && s.volume === "muted")').replace('fails: { playback: "stopped", volume: "loud" }', 'fails: { playback: "stopped", volume: "muted" }'), { root });
same("lifted path leaves the plain arrow unlit", [viaOff.errors, viaOff.html?.split('<path class="ve-e is-bug-path"').length - 1], [[], 1]);
// a lifted arrow comes back in along its node's row: with paused beside stopped, power off cannot use the right side, and play has the left
same("lifted arrow with no free side", renderPage(stereo.replace('id="paused" at="2 2"', 'id="paused" at="2 1"'), { root }).warnings, ['line 18 <script>: two lifted arrows leave region "playback" on its left; put stopped at the other end of its row']);
same("empty region", renderPage(stereo.replace("</ve-flow>", '  <ve-region id="treble" label="Treble"></ve-region>\n    </ve-flow>'), { root }).errors, ["line 33 <ve-region#treble>: a <ve-region> holds the <ve-node>s of its part; this one has none"]);
const loud = '        <ve-node id="loud" at="3 3">Loud</ve-node>\n';
same("node in no region", renderPage(stereo.replace(loud, "").replace("      <script", `${loud}      <script`), { root }).errors, ["line 17 <ve-node#loud>: loud is in no <ve-region>; state() returns parts, so every node belongs to one"]);
same("value not drawn", renderPage(stereo.replace(loud, ""), { root }).errors, ['line 17 <script>: the walk reached volume · loud, which is not drawn in region "volume"; add <ve-node id="loud"> inside it']);
same("region not a part", renderPage(stereo.replace('id="volume" label', 'id="sound" label'), { root }).errors, [
  'line 13 <ve-region#sound>: region "sound" is not a part of state() (playback, volume)',
  'line 18 <script>: state() has a part "volume" with no <ve-region id="volume">',
]);

// auto: the walk as Mermaid, written out by hand from the player's walk (same order and marks as the player page above)
const mermaid = toMermaid(loaded.player.walk, "flat");
same("player as Mermaid", mermaid, { mermaid: `stateDiagram-v2
  state "stopped-normal" as s0
  state "playing-normal" as s1
  state "stopped-loud" as s2
  state "playing-loud" as s3
  [*] --> s0
  s0 --> s1 : you press play
  s0 --> s2 : you turn it up
  s1 --> s3 : you turn it up
  s1 --> s0 : the track ends
  s2 --> s3 : you press play
  s2 --> s0 : you turn it down
  s3 --> s1 : you turn it down
  s3 --> s2 : the track ends
  class s0 may-break
  class s0 bug-path
  class s1 may-break
  class s2 breaks
  class s2 bug-path
  class s3 may-break`, bugEdges: [2] });
const drawnByPele = pele(mermaid.mermaid ?? "", { fontSize: 14, maxWidth: 960 }).svg;
same("Pele draws the marks", ["pele-state may-break bug-path", "pele-state breaks bug-path"].filter((c) => !drawnByPele.includes(c)), []);
// the elevator (repo/src/elevator.ts): 10 floors × door open or closed; the door opens on the roof after 9 rides up
const elevator = page("auto"), lifted10 = renderPage(elevator, { root });
same("auto page", [lifted10.errors, lifted10.report?.machines, ["pele-node[^\"]* breaks", "pele-node[^\"]* may-break", "pele-node[^\"]* bug-path", "pele-edge pele-transition bug-path"].filter((c) => !new RegExp(`class="${c}`).test(lifted10.html ?? ""))],
  [[], ["machine from src/elevator.ts · 20 states · 1 of 1 rule breaks in 10 steps"], []]);
same("auto with nodes", renderPage(elevator.replace("<script", '<ve-node id="floor 1 · closed" at="1 1">Floor 1</ve-node>\n      <script'), { root }).errors, ["line 7 <ve-flow>: auto draws the whole walk; remove the nodes, or drop auto"]);
// without auto, 19 of the 20 states undrawn are one error, not 19
same("too many to draw", renderPage(elevator.replace("<ve-flow auto", "<ve-flow").replace("<script", '<ve-node id="floor 1 · closed" at="1 1">Floor 1</ve-node>\n      <script'), { root }).errors, ["line 9 <script>: the walk has 20 states and 38 arrows, and 19 are not drawn; set auto, or model less"]);
// auto draws each part of the stereo in its own box; the one bug-path arrow (louder, normal → loud) is found by Pele's edge number
const autoParts = renderPage(stereo.replace(/<ve-region[\s\S]*?<\/ve-region>\s*/g, "").replace("<ve-flow ", "<ve-flow auto "), { root });
same("auto with parts", [autoParts.errors, autoParts.html?.split("pele-transition bug-path").length - 1], [[], 1]);
// a plan has no Pele step, so auto there is an error rather than an empty exhibit
const autoPlan = `<ve-plan title="Player" summary="s">\n<ve-claim id="a" level="2" title="The player">\n  <ve-flow auto label="The player">\n    <script type="text/plain" model>\n${player}\n    </script>\n  </ve-flow>\n</ve-claim>\n</ve-plan>`;
same("auto in a plan", renderPlan(autoPlan, { root }).errors.filter((e) => e.includes("<ve-flow>")), ["line 3 <ve-flow>: auto draws only on a page; in a plan, place the states by hand with <ve-node>"]);
// nested ids draw as a box in a box: playing holds its two volumes, and the arrows run at the top level
const nested = loadModel({ text: player.replace("state  = s => `${s.playback}-${s.volume}`.toLowerCase()", 'state  = s => s.playback === "Playing" ? ["playing", s.volume.toLowerCase()] : ["stopped · " + s.volume.toLowerCase()]'), root });
same("nested as Mermaid", toMermaid(nested.walk, nested.form), { mermaid: `stateDiagram-v2
  state "stopped · normal" as s0
  state "playing" as s1 {
    state "normal" as s2
    state "loud" as s3
  }
  state "stopped · loud" as s4
  [*] --> s0
  s0 --> s2 : you press play
  s0 --> s4 : you turn it up
  s2 --> s3 : you turn it up
  s2 --> s0 : the track ends
  s4 --> s3 : you press play
  s4 --> s0 : you turn it down
  s3 --> s2 : you turn it down
  s3 --> s4 : the track ends
  class s0 may-break
  class s0 bug-path
  class s2 may-break
  class s4 breaks
  class s4 bug-path
  class s3 may-break`, bugEdges: [2] });

if (problems.length) {
  console.error(`Machine check failed:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Machine check passed: ${Object.keys(cases).length} models, 4 pages`);
