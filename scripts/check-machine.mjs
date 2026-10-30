import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadModel } from "../plugins/visual-explainer/kit/machine.mjs";

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

const playerLoaded = {
  errors: [],
  events: [{ name: "you press play" }, { name: "you turn it up" }, { name: "you turn it down" }, { name: "the track ends" }],
  rules: ["never loud while stopped"],
  form: "flat",
  proof: { kind: "code", files: ["src/player.ts"] },
};

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
    proof: { kind: "model", files: ["src/player.ts"] },
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
for (const [name, { text, timeoutMs, ...want }] of Object.entries(cases)) {
  const got = JSON.parse(JSON.stringify(loadModel({ text, root, timeoutMs })).replaceAll(root, "<root>"));
  if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${name}:\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
}

if (problems.length) {
  console.error(`Machine check failed:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Machine check passed: ${Object.keys(cases).length} models`);
