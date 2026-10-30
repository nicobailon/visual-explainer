import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadModel } from "../plugins/visual-explainer/kit/machine.mjs";
import { renderPage } from "../plugins/visual-explainer/kit/render.mjs";

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

const problems = [];
for (const [name, { text, timeoutMs, cap, ...want }] of Object.entries(cases)) {
  const got = JSON.parse(JSON.stringify(loadModel({ text, root, timeoutMs, cap })).replaceAll(root, "<root>"));
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
same("diff page: errors", renderPage(page("diff"), { root }).errors, [
  "line 12 <ve-edge>: a flow with a model draws its arrows from the walk; remove this <ve-edge>",
  'line 13 <script>: the walk reached playing-loud, which is not drawn; add <ve-node id="playing-loud">',
  "line 11 <ve-node#muted>: muted is drawn, but no path from init reaches it",
]);
same("models off", renderPage(page("player"), { root, models: false }).errors, ["line 12 <script>: models run only when the MCP server starts with VISUAL_EXPLAINER_RUN_MODELS=1"]);
const twoCaptions = page("player").replace("</ve-flow>", '</ve-flow>\n    <div class="ve-player"><ol class="ve-cap"><li data-n="1/2">a</li><li data-n="2/2">b</li></ol></div>');
same("caption count", renderPage(twoCaptions, { root }).errors.map((e) => e.split(" (")[0]), ["line 30 <li>: the walk replays in 5 steps"]);

if (problems.length) {
  console.error(`Machine check failed:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Machine check passed: ${Object.keys(cases).length} models, 2 pages`);
