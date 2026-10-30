// A state machine read from code: the <script type="text/plain" model> child of a <ve-flow> (references/machines.md).
// The model runs in a child process, so the render stays synchronous, a reducer edited since the last render is read fresh
// (a long-lived host would keep the first import of it), and a step that never returns is cut off by the timeout.
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkAt, fileReader } from "./files.mjs";

const IMPORT = /^[ \t]*import\s+([\s\S]+?)\s+from\s*(["'])([^"'\n]+)\2[ \t]*;?[ \t]*(?:\/\/.*)?$/gm;
// the model runs as a data: URL; name it for the reader instead of printing the encoded source
const plain = (msg) => msg.replace(/"?data:text\/javascript,[^"\s]*"?/g, "the model script");
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// states are compared as JSON, so they hold only what JSON keeps
const isData = (v) => v === null || ["string", "boolean"].includes(typeof v) || Number.isFinite(v) || (Array.isArray(v) ? v.every(isData) : isObj(v) && Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(isData));
// Node 22.18+ strips TypeScript types by default; 22.6–22.17 need the flag
const [major, minor] = process.versions.node.split(".").map(Number);
const STRIP = !process.features.typescript && (major > 22 || (major === 22 && minor >= 6)) ? ["--experimental-strip-types"] : [];

/** Splits a model script into its imports (paths as written, from the repo root) and the rest, which keeps its line count. */
export function parseModel(text) {
  const imports = [...text.matchAll(IMPORT)].map((m) => ({ clause: m[1], path: m[3] }));
  return { imports, body: text.replace(IMPORT, (m) => m.replace(/[^\n]/g, "")) };
}

/** Loads and checks a model: { errors } when it is not a model, else { errors: [], events, rules, form, proof }.
 * events: [{ name, at? }] (at marks a hand-written step); rules: names; form: flat | regions | nested;
 * proof: { kind: "code" | "model", files } for the caption ("walked from src/player.ts" or "walked from a model of mixer.ts"). */
export function loadModel({ text, root, timeoutMs = 10_000 }) {
  const realRoot = realpathSync(root);
  const read = fileReader(realRoot);
  const { imports, body } = parseModel(text);
  const errors = [];
  const lines = imports.map(({ clause, path }) => {
    const r = read(path);
    if (r.error) errors.push(`import "${path}": ${r.error}`);
    return `import ${clause} from ${JSON.stringify(r.abs && pathToFileURL(r.abs).href)};`;
  });
  if (errors.length) return { errors };

  const input = `${lines.join(" ")} let init, events, rules, state;\n${body}\nexport default { init, events, rules, state };`;
  // SIGKILL, because a model's own SIGTERM handler would outlive the timeout
  const run = spawnSync(process.execPath, [...STRIP, fileURLToPath(import.meta.url)], { cwd: realRoot, input, timeout: timeoutMs, killSignal: "SIGKILL", encoding: "utf8", maxBuffer: 64 << 20 });
  if (run.error?.code === "ETIMEDOUT") return { errors: [`the model did not finish in ${timeoutMs / 1000} s; a step that never returns, or an import that waits on I/O`] };
  if (run.error) return { errors: [`the model could not run: ${run.error.message}`] };
  // Node exits 13 when a top-level await never settles; its warning points at the kit's own line, not the model's
  if (run.status === 13) return { errors: ["the model waits on an await that never settles"] };
  if (!run.stdout) return { errors: [`the model crashed (exit ${run.status ?? run.signal}): ${plain(run.stderr.split("\n").map((l) => l.trim()).filter((l) => l && !/^\^+$/.test(l)).at(-1) ?? "no message")}`] };
  let out;
  try { out = JSON.parse(run.stdout); } catch { return { errors: ["the model wrote to stdout itself; log with console.error"] }; }
  // name files by their path from the root, as the page does
  out.errors = out.errors.map((e) => e.replaceAll(`${pathToFileURL(realRoot).href}/`, "").replaceAll(`${realRoot}/`, ""));

  const hand = out.events.filter((e) => e.at);
  if (!imports.length) for (const e of out.events.filter((e) => !e.at)) out.errors.push(`event "${e.name}" is a function, but the model imports no code; import the step from the repo, or write { when, then, at } citing the code it copies`);
  for (const e of hand) {
    const r = /:\d+$/.test(e.at) ? checkAt(e.at, read) : { error: `at="${e.at}"; write at:"path:line"` };
    if (r.error) out.errors.push(`event "${e.name}": ${r.error}`);
  }
  if (out.errors.length) return { errors: out.errors };
  const proof = hand.length ? { kind: "model", files: [...new Set(hand.map((e) => e.at.split(":")[0]))] } : { kind: "code", files: imports.map((i) => i.path) };
  return { ...out, proof };
}

function loadError(e) {
  const msg = plain(String(e?.message ?? e).split("\n")[0]);
  if (e?.code === "ERR_MODULE_NOT_FOUND") return `an import cannot be found: ${msg}. Node runs .ts files by stripping their types, so every relative import needs the file's real extension (.ts, not .js), path aliases do not resolve, and packages must be installed under the root; fix the import, or write a hand model (when, then, at)`;
  // Node puts the file and line of unstrippable syntax on the first line of the stack
  if (e?.code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") return `${/:\d+$/.test(e.stack?.split("\n")[0]) ? e.stack.split("\n")[0] : "the code"} uses TypeScript that Node cannot strip (an enum, a namespace, or parameter properties): ${msg}; write a hand model (when, then, at)`;
  if (e?.code === "ERR_UNKNOWN_FILE_EXTENSION") return `Node ${process.version} cannot import ${msg.match(/"([^"]+)"/)?.[1] ?? "a .ts file"}; use Node 22.6 or later, or write a hand model (when, then, at)`;
  if (e instanceof SyntaxError) return `the model script does not parse: ${msg}`;
  return `the model threw while loading: ${msg}`;
}

/** The child: evaluates the model module from stdin and writes its checked shape as JSON, the only thing on stdout. */
async function child() {
  console.log = console.info = console.debug = console.error;
  // code that writes to stdout itself (a logger) goes to stderr; the result is the only thing on the real stdout
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = process.stderr.write.bind(process.stderr);
  const out = { errors: [], events: [], rules: [], form: null };
  const done = () => write(JSON.stringify(out), () => process.exit(0));
  const err = (e) => out.errors.push(e);
  let m;
  try {
    m = (await import(`data:text/javascript,${encodeURIComponent(readFileSync(0, "utf8"))}`)).default;
  } catch (e) {
    err(loadError(e));
    return done();
  }
  const { init, events, rules = {}, state } = m;

  if (init === undefined) err("the model sets no init; write init = the first state");
  else if (!isData(init)) err("init is not plain data (objects, arrays, strings, numbers, booleans, null); the walk compares states as JSON");

  if (!isObj(events) || !Object.keys(events).length) err('events is not an object of named events; write events = { "you press play": s => … }');
  else for (const [name, ev] of Object.entries(events)) {
    if (typeof ev === "function") out.events.push({ name });
    else if (isObj(ev) && typeof ev.then === "function" && (ev.when === undefined || typeof ev.when === "function")) {
      if (typeof ev.at === "string") out.events.push({ name, at: ev.at });
      else err(`event "${name}" has no at:"file:line"; a hand-written step cites the code it copies`);
    } else err(`event "${name}" is neither a function nor { when, then, at }`);
  }

  // a rule that holds on the state it must reject would pass on every machine, so it proves nothing
  if (!isObj(rules)) err('rules is not an object of named rules; write rules = { "never loud while stopped": { holds, fails } }');
  else for (const [name, r] of Object.entries(rules)) {
    if (!isObj(r) || typeof r.holds !== "function") { err(`rule "${name}" has no holds: s => true while the rule holds`); continue; }
    if (!("fails" in r) || !isData(r.fails)) { err(`rule "${name}" has no fails: the state, as plain data, that it must reject`); continue; }
    let held;
    try { held = r.holds(r.fails); } catch (e) { err(`rule "${name}" throws on its fails state: ${String(e?.message ?? e)}`); continue; }
    if (held) err(`rule "${name}" cannot fail; it is not a rule`);
    else out.rules.push(name);
  }

  if (typeof state !== "function") err("the model sets no state; write state = s => the ve-node id that draws s");
  else if (isData(init)) {
    let id;
    try {
      id = state(init);
      const ids = (v) => (Array.isArray(v) ? v.length > 0 && v.every((x) => typeof x === "string" && x) : typeof v === "string" && v);
      out.form = typeof id === "string" && id ? "flat" : Array.isArray(id) && ids(id) ? "nested" : isObj(id) && Object.keys(id).length && Object.values(id).every(ids) ? "regions" : null;
      if (!out.form) err(`state(init) returned ${JSON.stringify(id)}; return a ve-node id, an array of ids from the outermost state in, or an object of region → id`);
    } catch (e) {
      err(`state(init) throws: ${String(e?.message ?? e)}`);
    }
  }
  done();
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await child();
