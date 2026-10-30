// A state machine read from code: the <script type="text/plain" model> child of a <ve-flow> (references/machines.md).
// The model runs in a child process, so the render stays synchronous, a reducer edited since the last render is read fresh
// (a long-lived host would keep the first import of it), and a step that never returns is cut off by the timeout.
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkAt, fileReader } from "./files.mjs";
import { esc, rawText } from "./html.mjs";

const IMPORT = /^[ \t]*import\s+([\s\S]+?)\s+from\s*(["'])([^"'\n]+)\2[ \t]*;?[ \t]*(?:\/\/.*)?$/gm;
// the model runs as a data: URL; name it for the reader instead of printing the encoded source
const plain = (msg) => msg.replace(/"?data:text\/javascript,[^"\s]*"?/g, "the model script");
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// states are compared as JSON, so they hold only what JSON keeps
const isData = (v) => v === null || ["string", "boolean"].includes(typeof v) || Number.isFinite(v) || (Array.isArray(v) ? v.every(isData) : isObj(v) && Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(isData));
// the same state written with its keys in another order is the same state
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(",")}]` : isObj(v) ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}` : JSON.stringify(v));
const ids = (v) => (Array.isArray(v) ? v.length > 0 && v.every((x) => typeof x === "string" && x) : typeof v === "string" && v);
/** What a state() value draws: flat (an id), nested (ids from the outermost state in), regions (region → id or ids), or null. */
const formOf = (id) => (typeof id === "string" && id ? "flat" : Array.isArray(id) && ids(id) ? "nested" : isObj(id) && Object.keys(id).length && Object.values(id).every(ids) ? "regions" : null);
const message = (e) => String(e?.message ?? e).split("\n")[0];
// Node 22.18+ strips TypeScript types by default; 22.6–22.17 need the flag
const [major, minor] = process.versions.node.split(".").map(Number);
const STRIP = !process.features.typescript && (major > 22 || (major === 22 && minor >= 6)) ? ["--experimental-strip-types"] : [];

/** Splits a model script into its imports (paths as written, from the repo root) and the rest, which keeps its line count. */
function parseModel(text) {
  const imports = [...text.matchAll(IMPORT)].map((m) => ({ clause: m[1], path: m[3] }));
  return { imports, body: text.replace(IMPORT, (m) => m.replace(/[^\n]/g, "")) };
}

/** Loads, checks, and walks a model: { errors } when it is not a model or the walk fails, else { errors: [], events, rules, form, walk, proof }.
 * events: [{ name, at? }] (at marks a hand-written step); rules: names; form: flat | regions | nested;
 * walk: see walk(); proof: { kind: "code" | "model", files } for the caption ("walked from src/player.ts" or "walked from a model of mixer.ts").
 * One timeout covers loading and walking. */
export function loadModel({ text, root, timeoutMs = 10_000, cap = 2000 }) {
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
  const run = spawnSync(process.execPath, [...STRIP, fileURLToPath(import.meta.url), String(cap)], { cwd: realRoot, input, timeout: timeoutMs, killSignal: "SIGKILL", encoding: "utf8", maxBuffer: 64 << 20 });
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
  const msg = plain(message(e));
  if (e?.code === "ERR_MODULE_NOT_FOUND") return `an import cannot be found: ${msg}. Node runs .ts files by stripping their types, so every relative import needs the file's real extension (.ts, not .js), path aliases do not resolve, and packages must be installed under the root; fix the import, or write a hand model (when, then, at)`;
  // Node puts the file and line of unstrippable syntax on the first line of the stack
  if (e?.code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") return `${/:\d+$/.test(e.stack?.split("\n")[0]) ? e.stack.split("\n")[0] : "the code"} uses TypeScript that Node cannot strip (an enum, a namespace, or parameter properties): ${msg}; write a hand model (when, then, at)`;
  if (e?.code === "ERR_UNKNOWN_FILE_EXTENSION") return `Node ${process.version} cannot import ${msg.match(/"([^"]+)"/)?.[1] ?? "a .ts file"}; use Node 22.6 or later, or write a hand model (when, then, at)`;
  const declared = msg.match(/^Identifier '(init|events|rules|state)' has already been declared/)?.[1];
  if (declared) return `the model script declares ${declared}; write ${declared} = …, not const or let`;
  if (e instanceof SyntaxError) return `the model script does not parse: ${msg}`;
  return `the model threw while loading: ${msg}`;
}

/** Walks a checked model breadth-first from init: every event at every state, at most cap distinct states (compared as
 * stable JSON). It returns { error } or, by drawn id (state(): an id, or the JSON of a regions or nested value):
 *   states: drawn ids in the order reached · depths: { id: fewest events from init }
 *   edges: [{ from, to, events, depth }] between different drawn ids, events merged; depth: fewest events to first take it
 *   breaks: { rule: drawn ids where holds is false } · paths: { rule: the shortest [{ event, to }] from init to a break }
 *   first: the rule that breaks in the fewest steps, or null · mayBreak: ids from which a break is reachable, not breaking
 *   deadEnds: ids of states no event leaves · neverFired: events that change no reachable state
 *   counts: { states, full, edges, broken, rules, steps } for the Page line (steps: to the first break, or null) */
function walk({ init, events, rules = {}, state }, { cap = 2000 } = {}) {
  const NONE = Symbol("none");
  const steps = Object.entries(events).map(([name, ev]) => [name, typeof ev === "function" ? ev : (s) => (ev.when && !ev.when(s) ? NONE : ev.then(s))]);
  const form = formOf(state(init));
  const nodes = new Map(); // full key → { s, id, from, event, next: keys }
  const add = (s, from, event, depth) => {
    const v = state(s);
    if (formOf(v) !== form) throw new Error(`state() returns ${JSON.stringify(v)} at ${stable(s)}, but a ${form} value at init; return one form for every state`);
    nodes.set(stable(s), { s, id: typeof v === "string" ? v : stable(v), from, event, depth, next: new Set() });
  };
  const edges = new Map(), fired = new Set();
  try {
    add(init, null, null, 0);
    for (const [key, node] of nodes) { // a Map iterates entries added during the loop, so this is the BFS queue
      for (const [name, step] of steps) {
        let next;
        // a step that changes its input and returns it would rewrite a state already walked; states are plain data
        try { next = step(structuredClone(node.s)); } catch (e) { return { error: `event "${name}" throws at ${node.id}: ${message(e)}` }; }
        if (next === NONE) continue;
        if (!isData(next)) return { error: `event "${name}" at ${node.id} returns ${String(next)}, which is not plain data` };
        const k = stable(next);
        if (k === key) continue;
        fired.add(name);
        node.next.add(k);
        if (!nodes.has(k)) {
          if (nodes.size >= cap) return { error: `the walk has more than ${cap} states; model less (fewer events, or fewer fields in the state)` };
          add(next, key, name, node.depth + 1);
        }
        const to = nodes.get(k).id, pair = `${node.id}\n${to}`;
        if (to === node.id) continue;
        if (!edges.has(pair)) edges.set(pair, { from: node.id, to, events: [], depth: node.depth + 1 });
        if (!edges.get(pair).events.includes(name)) edges.get(pair).events.push(name);
      }
    }
  } catch (e) {
    return { error: message(e) };
  }

  const uniq = (xs) => [...new Set(xs)];
  // keyed by rule names and state ids, so no prototype: a state named constructor is not Object's
  const breaks = Object.create(null), paths = Object.create(null), broken = new Set();
  for (const [rule, { holds }] of Object.entries(rules)) {
    const bad = [];
    for (const [key, n] of nodes) {
      let ok;
      try { ok = holds(n.s); } catch (e) { return { error: `rule "${rule}" throws at ${n.id}: ${message(e)}` }; }
      if (!ok) bad.push(key);
    }
    breaks[rule] = uniq(bad.map((k) => nodes.get(k).id));
    bad.forEach((k) => broken.add(k));
    if (!bad.length) continue;
    // nodes are in BFS order, so the first breaking state is the nearest, and its parents give the shortest path
    const path = [];
    for (let n = nodes.get(bad[0]); n.from !== null; n = nodes.get(n.from)) path.unshift({ event: n.event, to: n.id });
    paths[rule] = path;
  }
  // reverse reachability: out from every breaking state along the steps backwards
  const prev = new Map([...nodes.keys()].map((k) => [k, []]));
  for (const [k, n] of nodes) for (const t of n.next) prev.get(t).push(k);
  const reach = new Set(broken), queue = [...broken];
  for (const k of queue) for (const p of prev.get(k)) if (!reach.has(p)) { reach.add(p); queue.push(p); }
  const breakIds = new Set([...broken].map((k) => nodes.get(k).id));
  const first = Object.keys(paths).reduce((a, r) => (a === null || paths[r].length < paths[a].length ? r : a), null);
  const states = uniq([...nodes.values()].map((n) => n.id));
  const depths = Object.create(null);
  for (const n of nodes.values()) depths[n.id] ??= n.depth; // BFS order, so the first state drawn as an id is its nearest
  return {
    states,
    depths,
    edges: [...edges.values()],
    breaks,
    paths,
    first,
    mayBreak: uniq([...nodes].filter(([k]) => reach.has(k)).map(([, n]) => n.id)).filter((id) => !breakIds.has(id)),
    deadEnds: uniq([...nodes.values()].filter((n) => !n.next.size).map((n) => n.id)),
    neverFired: steps.map(([name]) => name).filter((name) => !fired.has(name)),
    counts: { states: states.length, full: nodes.size, edges: edges.size, broken: Object.keys(paths).length, rules: Object.keys(rules).length, steps: first === null ? null : paths[first].length },
  };
}

export const plural = (n, one) => `${n} ${n === 1 ? one : `${one}s`}`;
// this many states the walk reached but nobody drew is a chart to draw with auto, not a list of nodes to add
const FLOOD = 6;
const flood = (w, k, at) => `${at}: the walk has ${w.states.length} states and ${w.edges.length} arrows, and ${k} are not drawn; set auto, or model less`;

/** The walk as drawn: each drawn id's depth, the arrows, the marks, and the shortest path to the first broken rule.
 * drawn is null for auto, which draws every state the walk reached. */
function flatView(w, drawn, { at, where }) {
  if (drawn) {
    const undrawn = w.states.filter((id) => !drawn.has(id));
    const errors = [
      ...(undrawn.length >= FLOOD ? [flood(w, undrawn.length, at)] : undrawn.map((id) => `${at}: the walk reached ${id}, which is not drawn; add <ve-node id="${id}">`)),
      ...[...drawn].filter(([id]) => !w.states.includes(id)).map(([id, k]) => `${where(k)}: ${id} is drawn, but no path from init reaches it`),
    ];
    if (errors.length) return { errors };
  }
  const path = w.first !== null ? w.paths[w.first] : [];
  const along = [w.states[0], ...path.map((p) => p.to)];
  return {
    depths: new Map(w.states.map((id) => [id, w.depths[id]])), edges: w.edges, path,
    breaking: new Set(Object.values(w.breaks).flat()), may: new Set(w.mayBreak),
    onPath: new Set(along), pathEdges: new Set(path.map((p, i) => `${along[i]}\n${p.to}`)),
  };
}

/** The same, per region: a state is an object of part → value, a value is the id of a node in its part's <ve-region>, and
 * each step draws one arrow in every part it changes. A step that every node of a region takes to the same node lifts to
 * one arrow from the region (its from is the region id). Marks go to the parts of each marked state. regions is null for
 * auto, which takes them from the walk. */
function regionView(w, drawn, regions, { at, where }) {
  const states = new Map(w.states.map((id) => [id, JSON.parse(id)]));
  const keys = Object.keys(states.get(w.states[0]));
  const errors = [];
  if (regions) {
    for (const [r, { k }] of regions) if (!keys.includes(r)) errors.push(`${where(k)}: region "${r}" is not a part of state() (${keys.join(", ")})`);
    for (const r of keys) if (!regions.has(r)) errors.push(`${at}: state() has a part "${r}" with no <ve-region id="${r}">`);
    const inRegion = new Set([...regions.values()].flatMap((g) => g.ids));
    for (const [id, k] of drawn) if (!inRegion.has(id)) errors.push(`${where(k)}: ${id} is in no <ve-region>; state() returns parts, so every node belongs to one`);
    if (errors.length) return { errors };
  }
  const depths = new Map(), part = new Map();
  for (const [id, s] of states) {
    if (Object.keys(s).join() !== keys.join()) return { errors: [`${at}: state() returns the parts ${Object.keys(s).join(", ")} at ${id}, but ${keys.join(", ")} at init; return the same parts for every state`] };
    for (const r of keys) {
      if (typeof s[r] !== "string") return { errors: [`${at}: part "${r}" of state() is ${JSON.stringify(s[r])}; a part's value is one ve-node id (nested states draw only as a whole-state array under auto)`] };
      if (part.has(s[r]) && part.get(s[r]) !== r) return { errors: [`${at}: "${s[r]}" is a value of both "${part.get(s[r])}" and "${r}"; a value names its node, so give each part its own`] };
      part.set(s[r], r);
      if (!depths.has(s[r])) depths.set(s[r], w.depths[id]); // the walk's order is by depth, so the first is the nearest
    }
  }
  if (regions) {
    const undrawn = [...part].filter(([v, r]) => !regions.get(r).ids.includes(v));
    if (undrawn.length >= FLOOD) errors.push(flood(w, undrawn.length, at));
    else for (const [v, r] of undrawn) errors.push(`${at}: the walk reached ${r} · ${v}, which is not drawn in region "${r}"; add <ve-node id="${v}"> inside it`);
    for (const [r, g] of regions) for (const id of g.ids) if (part.get(id) !== r) errors.push(`${where(drawn.get(id))}: ${id} is drawn in region "${r}", but no path from init reaches it there`);
    if (errors.length) return { errors };
  } else regions = new Map(keys.map((r) => [r, { ids: [...part].filter(([, p]) => p === r).map(([v]) => v) }]));

  const arrows = new Map();
  const add = (from, to, events, depth) => {
    // the walk's arrows come in the order it reached them, so the first depth an arrow gets is its least
    const key = `${from}\n${to}`;
    if (!arrows.has(key)) arrows.set(key, { from, to, events: [], depth });
    const e = arrows.get(key);
    for (const ev of events) if (!e.events.includes(ev)) e.events.push(ev);
  };
  for (const e of w.edges) for (const r of keys) if (states.get(e.from)[r] !== states.get(e.to)[r]) add(states.get(e.from)[r], states.get(e.to)[r], e.events, e.depth);
  const path = w.first !== null ? w.paths[w.first] : [];
  const onPath = [w.states[0], ...path.map((p) => p.to)].map((id) => states.get(id));
  // each step of the path, per part it changes; a lifted arrow is on the path only when the path takes its event
  const moves = onPath.slice(1).flatMap((s, i) => keys.filter((r) => s[r] !== onPath[i][r]).map((r) => ({ r, from: onPath[i][r], to: s[r], event: path[i].event })));
  const pathEdges = new Set();
  const lifted = [];
  for (const [r, g] of regions) {
    const own = [...arrows.values()].filter((e) => part.get(e.from) === r);
    for (const ev of new Set(own.flatMap((e) => e.events))) {
      const taking = own.filter((e) => e.events.includes(ev)), to = taking[0].to, from = new Set(taking.map((e) => e.from));
      if (taking.length < 2 || taking.some((e) => e.to !== to) || g.ids.some((id) => id !== to && !from.has(id))) continue;
      for (const e of taking) e.events = e.events.filter((x) => x !== ev);
      const prior = lifted.find((e) => e.from === r && e.to === to);
      if (prior) { prior.events.push(ev); prior.depth = Math.min(prior.depth, ...taking.map((e) => e.depth)); }
      else lifted.push({ from: r, to, events: [ev], depth: Math.min(...taking.map((e) => e.depth)), lifted: true });
      if (moves.some((p) => p.r === r && p.to === to && p.event === ev)) pathEdges.add(`${r}\n${to}`);
    }
  }
  const partsOf = (ids) => ids.flatMap((id) => keys.map((r) => states.get(id)[r]));
  // a plain arrow is on the path only if it still carries the event the path took (a lifted event left it above)
  for (const p of moves) if (arrows.get(`${p.from}\n${p.to}`)?.events.includes(p.event)) pathEdges.add(`${p.from}\n${p.to}`);
  const breaking = new Set(partsOf(Object.values(w.breaks).flat()));
  return {
    depths, path, breaking, pathEdges, regions,
    edges: [...[...arrows.values()].filter((e) => e.events.length), ...lifted],
    may: new Set(partsOf(w.mayBreak).filter((v) => !breaking.has(v))),
    onPath: new Set(onPath.flatMap((s) => keys.map((r) => s[r]))),
  };
}

/** The model loaded and walked, or { errors } that each start with the script's line (the MCP opt-in first). */
function walked(script, { root, models, where }) {
  const at = where(script);
  if (!models) return { errors: [`${at}: models run only when the MCP server starts with VISUAL_EXPLAINER_RUN_MODELS=1`] };
  const m = loadModel({ text: rawText(script), root });
  return m.errors.length ? { errors: m.errors.map((e) => `${at}: ${e}`) } : m;
}

/** The machine's Page line and the "walked from" caption under its drawing. */
function summary(m) {
  const w = m.walk, c = w.counts;
  const line = [
    `machine from ${m.proof.kind === "model" ? "a model of " : ""}${m.proof.files.join(", ")}`,
    plural(c.states, "state"),
    c.rules && (c.broken ? `${c.broken} of ${plural(c.rules, "rule")} ${c.broken === 1 ? "breaks" : "break"} ${c.steps ? `in ${plural(c.steps, "step")}` : "at the start"}` : `${plural(c.rules, "rule")} ${c.rules === 1 ? "holds" : "hold"}`),
    w.deadEnds.length && plural(w.deadEnds.length, "dead end"),
    w.neverFired.length && `${w.neverFired.map((e) => `"${e}"`).join(", ")} never ${w.neverFired.length === 1 ? "fires" : "fire"}`,
  ].filter(Boolean).join(" · ");
  const proof = `<p class="ve-label">walked from ${m.proof.kind === "model" ? "a model of " : ""}${m.proof.files.map((f) => `<code>${esc(f)}</code>`).join(", ")}</p>`;
  return { line, proof };
}

/** A <ve-flow auto>: the whole walk as Mermaid for Pele to draw, { errors } or { mermaid, bugEdges, line, proof }. */
export function drawAuto(script, ctx) {
  const m = walked(script, ctx);
  if (m.errors.length) return { errors: m.errors };
  const t = toMermaid(m.walk, m.form, ctx.where(script));
  return t.errors ? t : { ...t, ...summary(m) };
}

/** A walk as a Mermaid state diagram: { mermaid, bugEdges } or { errors }. A flat state() draws one state per id, nested ids
 * draw composites from the outermost in, and each part of an object draws its own composite, with lifted arrows from the
 * composite (Pele draws a concurrent `--` region as an empty box, so parts are separate). Marks are classes on the states.
 * Pele numbers a diagram's transitions in source order, [*] first; bugEdges are the numbers of those on the bug path. */
export function toMermaid(w, form, at = "") {
  const v = form === "regions" ? regionView(w, null, null, { at }) : flatView(w, null, { at });
  if (v.errors) return v;
  const alias = new Map(), name = (key) => alias.get(key) ?? alias.set(key, `s${alias.size}`).get(key);
  // Pele reads these as character references; a raw " ends the label
  const text = (s) => s.replace(/\s+/g, " ").replace(/[;&"<>]/g, (c) => ({ ";": "#59;", "&": "#amp;", '"': "#quot;", "<": "#lt;", ">": "#gt;" })[c]);
  const lines = ["stateDiagram-v2"], bugEdges = [];
  let n = 0;
  const go = (indent, from, to, events, lit) => { lines.push(`${indent}${from} --> ${to}${events ? ` : ${text(events.join(" · "))}` : ""}`); if (lit) bugEdges.push(n); n++; };
  const lit = (e) => v.pathEdges.has(`${e.from}\n${e.to}`);
  if (form === "regions") {
    const init = JSON.parse(w.states[0]);
    for (const [r, g] of v.regions) {
      lines.push(`  state "${text(r)}" as ${name(`region\n${r}`)} {`);
      go("    ", "[*]", name(init[r]));
      for (const id of g.ids) lines.push(`    state "${text(id)}" as ${name(id)}`);
      for (const e of v.edges.filter((e) => (e.lifted ? e.from === r : g.ids.includes(e.from)))) go("    ", name(e.lifted ? `region\n${r}` : e.from), name(e.to), e.events, lit(e));
      lines.push("  }");
    }
  } else {
    const paths = [...v.depths.keys()].map((id) => [id, form === "nested" ? JSON.parse(id) : [id]]);
    const states = (prefix, indent) => {
      const here = paths.filter(([, p]) => p.length > prefix.length && prefix.every((x, i) => p[i] === x));
      for (const head of new Set(here.map(([, p]) => p[prefix.length]))) {
        const below = [...prefix, head];
        if (here.some(([, p]) => p.length > below.length && p[prefix.length] === head)) {
          lines.push(`${indent}state "${text(head)}" as ${name(`${JSON.stringify(below)}\n`)} {`);
          states(below, `${indent}  `);
          lines.push(`${indent}}`);
        }
        const leaf = here.find(([, p]) => p.length === below.length && p[prefix.length] === head);
        if (leaf) lines.push(`${indent}state "${text(head)}" as ${name(leaf[0])}`);
      }
    };
    states([], "  ");
    go("  ", "[*]", name(w.states[0]));
    for (const e of v.edges) go("  ", name(e.from), name(e.to), e.events, lit(e));
  }
  const dead = new Set(form === "regions" ? [] : w.deadEnds), path = w.first !== null ? v.onPath : new Set();
  for (const id of v.depths.keys()) for (const [cls, on] of [["breaks", v.breaking], ["may-break", v.may], ["bug-path", path], ["dead-end", dead]]) if (on.has(id)) lines.push(`  class ${name(id)} ${cls}`);
  return { mermaid: lines.join("\n"), bugEdges };
}

/** What a <ve-flow> draws from its <script model>, given its drawn nodes (id → element): { errors } or
 *   edges: <ve-edge>-like parts for flow.mjs's arrow loop · nodes: id → attributes to add (data-s and the mark flags)
 *   steps: one caption per replay step · proof: the "walked from" line under the drawing · line: the machine's Page line.
 * The replay steps through the walk's depths (step k: what k − 1 events reach), then, when a rule breaks, one step that
 * lights the shortest path to it. */
export function drawModel(script, drawn, { root, models, where, regions }) {
  const at = where(script);
  const m = walked(script, { root, models, where });
  if (m.errors.length) return { errors: m.errors };
  const w = m.walk;
  if (m.form === "nested") return { errors: [`${at}: state() returns an array of nested ids, which only <ve-flow auto> draws; set auto, or return a ve-node id or an object of region → id`] };
  if (m.form === "flat" && regions.size) return { errors: [`${where([...regions.values()][0].k)}: a <ve-region> draws one part of state(), so state() must return an object of region → id`] };
  const v = m.form === "flat" ? flatView(w, drawn, { at, where }) : regionView(w, drawn, regions, { at, where });
  if (v.errors) return v;

  const { depths, edges: arrows, breaking, may, onPath, pathEdges, path } = v;
  const depthSteps = Math.max(...depths.values(), ...arrows.map((e) => e.depth)) + 1;
  // a rule that already fails at init has an empty path: the last step marks init alone
  const last = w.first !== null ? ` ${depthSteps + 1}` : "";
  const nodes = new Map([...depths].map(([id, d]) => [id, {
    "data-s": `${d + 1}${onPath.has(id) ? last : ""}`,
    ...(breaking.has(id) && { breaks: "" }), ...(may.has(id) && { "may-break": "" }), ...(last && onPath.has(id) && { "bug-path": "" }),
  }]));
  const edges = arrows.map((e) => {
    const lit = last && pathEdges.has(`${e.from}\n${e.to}`);
    return { name: "script", pos: script.pos, children: [], attrs: { from: e.from, to: e.to, label: e.events.join(" · "), "data-s": `${e.depth + 1}${lit ? last : ""}`, ...(lit && { "bug-path": "" }) } };
  });
  const steps = [];
  for (let k = 1, before = ""; k <= depthSteps; k++) {
    const s = [...depths.values()].filter((d) => d < k).length, a = arrows.filter((e) => e.depth < k).length;
    const text = `${plural(s, "state")}${a ? ` · ${plural(a, "arrow")}` : ""}`;
    steps.push(text === before ? `${text} · nothing new` : text);
    before = text;
  }
  if (last) steps.push(path.length ? `breaks “${w.first}” in ${plural(path.length, "step")}: ${path.map((p) => p.event).join(" → ")}` : `breaks “${w.first}” at the start`);
  return { edges, nodes, steps, ...summary(m) };
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
    try { held = r.holds(r.fails); } catch (e) { err(`rule "${name}" throws on its fails state: ${message(e)}`); continue; }
    if (held) err(`rule "${name}" cannot fail; it is not a rule`);
    else out.rules.push(name);
  }

  if (typeof state !== "function") err("the model sets no state; write state = s => the ve-node id that draws s");
  else if (isData(init)) {
    try {
      const id = state(init);
      out.form = formOf(id);
      if (!out.form) err(`state(init) returned ${JSON.stringify(id)}; return a ve-node id, an array of ids from the outermost state in, or an object of region → id`);
    } catch (e) {
      err(`state(init) throws: ${message(e)}`);
    }
  }
  if (!out.errors.length) {
    const w = walk(m, { cap: +process.argv[2] });
    if (w.error) err(w.error);
    else out.walk = w;
  }
  done();
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await child();
