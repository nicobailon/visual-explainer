#!/usr/bin/env node
// Turns a plan source page (<ve-*> tags) into one static, self-contained HTML page.
// It checks the plan's shape, reads cited code from disk, and inlines plan.css and plan.js.
// No dependencies, so it runs from a copied skill folder.
import { readFileSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* ── a small HTML tree: enough to find tags and attributes; untouched parts serialize byte for byte ── */
const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const TAG = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=\/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;

function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

function parseHtml(html) {
  const root = { name: "#root", attrs: {}, children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const text = (raw) => raw && top().children.push({ text: raw });
  let last = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(html))) {
    text(html.slice(last, m.index));
    last = TAG.lastIndex;
    if (m[0].startsWith("<!")) { top().children.push({ text: m[0], comment: true }); continue; }
    if (m[1]) {
      const i = stack.findLastIndex((n) => n.name === m[1].toLowerCase());
      if (i > 0) { stack[i].closeRaw = m[0]; stack.length = i; } else text(m[0]);
      continue;
    }
    const name = m[2].toLowerCase();
    const node = { name, attrs: parseAttrs(m[3]), openRaw: m[0], children: [], pos: m.index, selfClose: !!m[4] || VOID.has(name) };
    top().children.push(node);
    if (node.selfClose) continue;
    if (RAW_TEXT.has(name)) {
      // only "</script" followed by space, / or > ends the text; "</scripture>" inside a string does not
      const closer = new RegExp(`</${name}(?=[\\s/>])`, "gi");
      closer.lastIndex = last;
      const end = closer.exec(html)?.index ?? -1;
      const stop = end < 0 ? html.length : end;
      node.children.push({ text: html.slice(last, stop) });
      node.closeRaw = end < 0 ? "" : html.slice(end).match(/^<\/[^>]*>/)[0];
      last = stop + node.closeRaw.length;
      TAG.lastIndex = last;
      continue;
    }
    stack.push(node);
  }
  text(html.slice(last));
  return root;
}

const serialize = (n) => n.html ?? n.text ?? (n.openRaw ?? "") + n.children.map(serialize).join("") + (n.closeRaw ?? "");
const inner = (n) => n.children.map(serialize).join("");
const kids = (n) => n.children.filter((c) => c.name);
function* walk(n) { for (const c of n.children ?? []) if (c.name) { yield c; yield* walk(c); } }
const find = (n, pred) => [...walk(n)].filter(pred);
const textOf = (n) => (n.text !== undefined ? (n.comment ? "" : decode(n.text)) : n.name === "script" || n.name === "style" ? "" : n.children.map(textOf).join(""));
const rawText = (n) => n.children.map((c) => c.text ?? "").join("");
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const hasClass = (n, c) => (n.attrs?.class ?? "").split(/\s+/).includes(c);

/** True when the page holds a real <ve-plan> element, not one mentioned in a comment, script, or style. */
const hasPlan = (html) => find(parseHtml(html), (n) => n.name === "ve-plan").length > 0;
function addClass(n, cls) {
  const m = n.openRaw.match(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  n.openRaw = m ? n.openRaw.replace(m[0], ` class="${esc(`${m[1] ?? m[2]} ${cls}`.trim())}"`) : n.openRaw.replace(/\s*(\/?)>$/, ` class="${cls}"$1>`);
  n.attrs.class = `${n.attrs.class ?? ""} ${cls}`.trim();
}

/* ── code: read from disk inside the root, highlight, number ── */
const SECRET_NAME = /(^|\/)\.(git|ssh|aws|gnupg|kube)(\/|$)|(^|\/)(\.env(\.[^/]*)?|\.npmrc|\.netrc|\.pypirc|\.pgpass|\.git-credentials|id_(rsa|dsa|ecdsa|ed25519)[^/]*|credentials[^/]*|secrets?(\.[^/]*)?)$|\.(pem|key|p12|pfx|tfstate|kdbx|keystore)$/i;
const SECRET_TEXT = /-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_\w{30,}|sk-(?:ant-)?[A-Za-z0-9_-]{32,}|xox[abeprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}/;
const KEYWORDS = new Set(`abstract and as async await break case catch class const continue def default defer del delete do elif else enum except export extends false final finally fn for from func function go if impl import in instanceof interface is lambda let match mod mut new nil none not null of or package pass private protected pub public raise readonly return select self static struct super switch this throw throws trait true try type typeof undefined use var void where while with yield
add alter by column constraint create cross distinct drop exists foreign group having index inner insert into join key left limit offset on order outer primary references returning right set skip table union unique update values when then end begin locked`.split(/\s+/));
const HASH_COMMENTS = new Set(["py", "python", "sh", "bash", "zsh", "shell", "rb", "ruby", "yaml", "yml", "toml", "ini", "dockerfile", "make"]);
const STRING = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'` + "|`(?:\\\\.|[^`\\\\])*`";

/** Highlighted lines. Tokens never span a returned line, so each line is valid HTML on its own. */
function highlight(code, lang) {
  const l = (lang || "").toLowerCase();
  if (!l || ["text", "plain", "txt", "md", "markdown"].includes(l)) return code.split("\n").map(esc);
  const comment = HASH_COMMENTS.has(l) ? String.raw`#[^\n]*` : l === "sql" ? String.raw`--[^\n]*|\/\*[\s\S]*?\*\/` : String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)`;
  const re = new RegExp(`(${comment})|(${STRING})|(\\b\\d[\\d_.]*\\b)|([A-Za-z_$][\\w$]*)`, "g");
  const lines = [""];
  const push = (t, cls) => t.split("\n").forEach((piece, i) => {
    if (i) lines.push("");
    if (piece) lines[lines.length - 1] += cls ? `<span class="tk-${cls}">${esc(piece)}</span>` : esc(piece);
  });
  let last = 0;
  for (const m of code.matchAll(re)) {
    push(code.slice(last, m.index));
    push(m[0], m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : KEYWORDS.has(l === "sql" ? m[4].toLowerCase() : m[4]) ? "k" : "");
    last = m.index + m[0].length;
  }
  push(code.slice(last));
  return lines;
}

function dedent(text) {
  const lines = text.replace(/\t/g, "  ").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
}

const EDITORS = { vscode: "vscode://file", cursor: "cursor://file", windsurf: "windsurf://file", zed: "zed://file" };

/* ── the renderer ── */
export function renderPlan(source, { root = process.cwd(), editor = process.env.VISUAL_EXPLAINER_EDITOR || "vscode", sendBack = false } = {}) {
  const errors = [], warnings = [];
  const lineOf = (pos) => source.slice(0, pos).split("\n").length;
  const where = (n) => `line ${lineOf(n.pos)} <${n.name}${n.attrs.id ? `#${n.attrs.id}` : ""}>`;
  const realRoot = realpathSync(root);
  const filesRead = new Set();
  const fileCache = new Map();
  const editorBase = EDITORS[editor] ?? null;
  if (!editorBase && editor !== "none") warnings.push(`VISUAL_EXPLAINER_EDITOR="${editor}" is unknown (use ${Object.keys(EDITORS).join(", ")} or none); no editor links`);

  function readFile(path) {
    if (fileCache.has(path)) return fileCache.get(path);
    let out;
    try {
      const requested = relative(realRoot, resolve(realRoot, path)).split(sep).join("/");
      const real = realpathSync(resolve(realRoot, path));
      const rel = relative(realRoot, real);
      if (rel.startsWith("..") || rel.startsWith(sep) || /^[a-z]:/i.test(rel)) out = { error: `${path} is outside ${realRoot}` };
      // check the cited name and the link target both, so a link named .env cannot pass as config.txt
      else if (SECRET_NAME.test(requested) || SECRET_NAME.test(rel.split(sep).join("/"))) out = { error: `${path} looks like a secrets file; not reading it` };
      else if (!statSync(real).isFile()) out = { error: `${path} is not a file` };
      else out = { text: readFileSync(real, "utf8").replace(/\r\n/g, "\n"), abs: real };
    } catch {
      out = { missing: true, error: `${path} not found under ${realRoot}` };
    }
    fileCache.set(path, out);
    return out;
  }
  const editorHref = (abs, line) => {
    if (!editorBase || !abs) return null;
    const p = abs.replace(/\\/g, "/");
    return `${editorBase}${encodeURI(p.startsWith("/") ? p : `/${p}`)}${line ? `:${line}` : ""}`;
  };
  const fileLink = (label, abs, line) => {
    const href = editorHref(abs, line);
    return href ? `<a class="file-link" href="${esc(href)}" title="Open in editor">${esc(label)}</a>` : `<span class="file-link">${esc(label)}</span>`;
  };

  function codeRows(lines, { start = 1, hl = new Set(), pins = {}, target = 0, diff = false, lang }) {
    const plain = diff ? lines.map((l) => (/^[+\- ]/.test(l) ? l.slice(1) : l)) : lines;
    const html = highlight(plain.join("\n"), lang);
    let num = start;
    const rows = [];
    lines.forEach((raw, i) => {
      let cls = "", gutter, shown = null;
      if (diff && raw.startsWith("@@")) {
        const m = raw.match(/\+(\d+)/);
        if (m) num = +m[1];
        rows.push(`<tr class="hunk"><td class="ln">⋯</td><td class="src">${esc(raw)}</td></tr>`);
        return;
      }
      if (diff && raw[0] === "-") { cls = "rem"; gutter = "−"; }
      else { shown = num++; gutter = String(shown); if (diff && raw[0] === "+") cls = "add"; else if (hl.has(shown) || shown === target) cls = "hl"; }
      rows.push(`<tr${cls ? ` class="${cls}"` : ""}><td class="ln">${gutter}</td><td class="src">${html[i] || " "}</td></tr>`);
      for (const pin of (shown && pins[shown]) || []) rows.push(`<tr class="pin"><td class="ln"></td><td><span class="pin-text">↳ ${pin}</span></td></tr>`);
    });
    return rows.join("");
  }

  /* claims and decisions are numbered in document order before anything expands */
  const doc = parseHtml(source);
  const plans = find(doc, (n) => n.name === "ve-plan");
  if (plans.length !== 1) return { errors: [`a plan needs exactly one <ve-plan>; found ${plans.length}`], warnings, files: [] };
  const plan = plans[0];
  const claims = [];
  const numberClaims = (parent, prefix, level) => {
    let i = 0;
    for (const c of kids(parent).filter((k) => k.name === "ve-claim")) {
      const aux = c.attrs.aux;
      c.no = aux ? "" : `${prefix ? `${prefix}.` : ""}${++i}`;
      c.level = level;
      c.label = aux ? (aux === "scope" ? "not changing" : "shared") : `claim ${c.no}`;
      if (aux && aux !== "shared" && aux !== "scope") errors.push(`${where(c)}: aux="${aux}"; use aux="shared" or aux="scope"`);
      claims.push(c);
      numberClaims(c, c.no || aux, level + 1);
    }
  };
  numberClaims(plan, "", 1);
  for (const c of find(doc, (n) => n.name === "ve-claim" && n.level === undefined)) errors.push(`${where(c)}: a <ve-claim> must sit directly inside <ve-plan> or another <ve-claim>`);
  const claimNos = new Set(claims.map((c) => c.no).filter(Boolean));
  const asks = find(doc, (n) => n.name === "ve-ask");
  asks.forEach((a, i) => { a.k = i + 1; });
  const askIds = new Map();

  /* shape of the tree */
  const tops = kids(plan).filter((k) => k.name === "ve-claim");
  const topClaims = tops.filter((c) => !c.attrs.aux);
  if (!topClaims.length) errors.push("the plan has no numbered claims");
  if (topClaims.length > 5) warnings.push(`${topClaims.length} top-level claims; keep 2–5 and group the rest`);
  for (const k of kids(plan)) if (k.name !== "ve-claim") warnings.push(`${where(k)}: only <ve-claim> belongs directly in <ve-plan>`);
  const firstAux = tops.findIndex((c) => c.attrs.aux);
  if (firstAux >= 0 && tops.slice(firstAux).some((c) => !c.attrs.aux)) warnings.push("put the aux claims (shared, not changing) after the numbered claims");
  if (!tops.some((c) => c.attrs.aux === "scope")) warnings.push('no <ve-claim aux="scope">; end with what is not changing');
  const EXHIBIT = new Set(["figure", "ve-code", "ve-calls", "ve-mock", "ve-flow", "table", "pre", "svg"]);
  for (const c of claims) {
    const els = kids(c);
    const p = els[0]?.name === "p" ? els[0] : null;
    c.p = p;
    if (!p && !c.attrs.at) errors.push(`${where(c)} (${c.label}): the first child must be a <p> with the claim`);
    const text = p ? textOf(p).replace(/\s+/g, " ").trim() : "";
    c.text = text || c.attrs.at || "";
    if (p && words(text) > 16) warnings.push(`${c.label}: ${words(text)} words; keep a claim to about 12`);
    if (p && c.level <= 2 && !c.attrs.aux && !/[.?!]["”’)]?$/.test(text)) warnings.push(`${c.label}: "${text.slice(0, 48)}" reads as a heading; write a sentence that can be true or false`);
    const exhibits = els.filter((e) => EXHIBIT.has(e.name));
    const sub = els.filter((e) => e.name === "ve-claim");
    if (exhibits.length > 1) warnings.push(`${c.label}: ${exhibits.length} exhibits (${exhibits.map((e) => e.name).join(", ")}); one per claim, so give the others child claims`);
    if (!exhibits.length && !sub.length && c.attrs.aux !== "scope") warnings.push(`${c.label}: nothing proves it; add one exhibit`);
    if (sub.length > 5) warnings.push(`${c.label}: ${sub.length} child claims; 5 at most`);
    if (c.level > 3) warnings.push(`${c.label}: level ${c.level}; three levels at most (what › how › where)`);
    const firstSub = els.findIndex((e) => e.name === "ve-claim");
    if (firstSub >= 0 && els.slice(firstSub).some((e) => e.name === "ve-ask")) warnings.push(`${c.label}: put the decision after the exhibit and before the child claims`);
    if (c.attrs.evidence && !["read", "inferred", "guess"].includes(c.attrs.evidence)) errors.push(`${c.label}: evidence="${c.attrs.evidence}"; use read, inferred, or guess`);
    if (c.attrs.status && !["built", "changed", "dropped"].includes(c.attrs.status)) errors.push(`${c.label}: status="${c.attrs.status}"; use built, changed, or dropped`);
    if ((c.attrs.status === "changed" || c.attrs.status === "dropped") && !c.attrs.note) warnings.push(`${c.label}: status="${c.attrs.status}" without note=""; say why`);
    if (c.attrs.at) {
      const [path, line] = c.attrs.at.split(":");
      const r = readFile(path);
      // a path alone may name a file the plan creates; a line must exist
      if (line !== undefined && !/^[1-9]\d*$/.test(line)) errors.push(`${c.label}: at="${c.attrs.at}"; write at="path" or at="path:line" with a line number from 1`);
      else if (r.error && (!r.missing || line)) errors.push(`${c.label}: at="${c.attrs.at}": ${r.error}`);
      else if (!r.missing && line && +line > r.text.split("\n").length) errors.push(`${c.label}: at="${c.attrs.at}", but ${path} has ${r.text.split("\n").length} lines`);
      c.atAbs = r.abs;
    }
  }
  if (asks.length > 6) warnings.push(`${asks.length} decisions; ask 2–5, only about forks that change what gets built, and default the rest`);
  const h1 = find(doc, (n) => n.name === "h1")[0];
  const h1Text = h1 ? textOf(h1).replace(/\s+/g, " ").trim() : "";
  if (!h1) warnings.push("no <h1>; name the change and the place in 3–7 words");
  else if (words(h1Text) > 8 || /[.!?]$/.test(h1Text)) warnings.push(`<h1> "${h1Text}" is a sentence; name the change and the place in 3–7 words`);
  const titleNode = find(doc, (n) => n.name === "title")[0];
  if (!titleNode || !textOf(titleNode).trim()) errors.push("missing <title>; it names the page and keys the reader's saved answers");

  /* expanders: children expand before parents, so a claim sees its exhibits already rendered */
  function expandCode(n) {
    const at = where(n);
    const src = n.attrs.src;
    const script = kids(n).find((k) => k.name === "script");
    const diff = "diff" in n.attrs;
    let text, start = +(n.attrs.start || 1), abs = null;
    const file = n.attrs.file || src || "";
    if (src) {
      const r = readFile(src);
      if (r.error) { errors.push(`${at}: src="${src}": ${r.error}`); return ""; }
      const all = r.text.replace(/\n$/, "").split("\n");
      let a = 1, b = all.length;
      if (n.attrs.lines) {
        const m = n.attrs.lines.match(/^(\d+)(?:-(\d+))?$/);
        if (!m) { errors.push(`${at}: lines="${n.attrs.lines}"; write lines="40-60"`); return ""; }
        a = +m[1]; b = +(m[2] || m[1]);
        if (a < 1 || a > b || b > all.length) { errors.push(`${at}: lines="${n.attrs.lines}", but ${src} has ${all.length} lines`); return ""; }
      } else if (all.length > 40) warnings.push(`${at}: no lines= on a ${all.length}-line file; cite a range`);
      text = all.slice(a - 1, b).join("\n");
      start = a; abs = r.abs;
      if (SECRET_TEXT.test(text)) { errors.push(`${at}: ${src} lines ${a}–${b} look like they hold a secret; not including them`); return ""; }
      filesRead.add(src);
    } else if (script) text = dedent(rawText(script));
    else { errors.push(`${at}: give src="path" lines="a-b", or put the code in <script type="text/plain">`); return ""; }
    const lines = text.split("\n");
    if (lines.length > 40) warnings.push(`${at}: ${lines.length} lines; keep a slice to 10–25`);
    const pins = {};
    for (const p of kids(n).filter((k) => k.name === "ve-pin")) {
      const line = +p.attrs.line;
      if (!line) { errors.push(`${where(p)}: needs line="N" (the number shown in the gutter)`); continue; }
      (pins[line] ||= []).push(inner(p).trim());
    }
    const shown = new Set();
    let num = start;
    for (const l of lines) { if (diff && l.startsWith("@@")) { const m = l.match(/\+(\d+)/); if (m) num = +m[1]; continue; } if (!(diff && l[0] === "-")) shown.add(num++); }
    for (const line of Object.keys(pins)) if (!shown.has(+line)) errors.push(`${at}: <ve-pin line="${line}"> matches no line shown (${start}–${num - 1})`);
    const hl = new Set();
    for (const part of (n.attrs.hl || "").split(",")) { const m = part.trim().match(/^(\d+)(?:-(\d+))?$/); if (m) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) hl.add(i); }
    const lang = n.attrs.lang || extname(file).slice(1);
    const title = n.attrs.title || file || "code";
    const range = src || n.attrs.start ? `L${start}–${num - 1}` : "";
    return `<figure class="code"><figcaption class="code-head">${abs ? fileLink(title, abs, start) : `<span class="file-link">${esc(title)}</span>`}${range ? `<span class="code-lines">${range}</span>` : ""}<span class="code-lang">${esc(diff ? `${lang || "text"} · diff` : lang)}</span></figcaption><div class="code-body"><table><tbody>${codeRows(lines, { start, hl, pins, diff, lang })}</tbody></table></div></figure>`;
  }

  function expandCalls(n) {
    const at = where(n);
    const script = kids(n).find((k) => k.name === "script");
    if (!script && kids(n).length) { errors.push(`${at}: put the call lines in <script type="text/plain"> so < and > survive`); return ""; }
    const rows = [];
    for (const raw of dedent(script ? rawText(script) : textOf(n)).split("\n")) {
      if (!raw.trim()) { rows.push({ sep: true }); continue; }
      const mark = /^[+\-~?](?=\s)/.test(raw) ? raw[0] : " ";
      const rest = mark === " " ? raw : ` ${raw.slice(1)}`;
      let body = rest.trim(), note = "", loc = "";
      const ni = body.search(/\s--\s/);
      if (ni >= 0) { note = body.slice(ni).replace(/^\s--\s/, "").trim(); body = body.slice(0, ni).trim(); }
      const li = body.search(/\s@\s*\S+$/);
      if (li >= 0) { loc = body.slice(li).replace(/^\s@\s*/, ""); body = body.slice(0, li).trim(); }
      rows.push({ mark, indent: rest.match(/^ */)[0].length, body, note, loc });
    }
    const real = rows.filter((r) => !r.sep);
    if (!real.length) { errors.push(`${at}: no call lines`); return ""; }
    const marked = real.filter((r) => r.mark !== " ");
    const base = Math.min(...(marked.length ? marked : real).map((r) => r.indent));
    for (const r of real) r.depth = Math.max(0, Math.round((r.indent - base) / 2));
    // tree guides need to know whether a row is its parent's last child
    real.forEach((r, i) => {
      r.last = [];
      for (let d = 1; d <= r.depth; d++) {
        let isLast = true;
        for (let j = rows.indexOf(r) + 1; j < rows.length && !rows[j].sep; j++) { if (rows[j].depth < d) break; if (rows[j].depth === d) { isLast = false; break; } }
        r.last[d] = isLast;
      }
    });
    const counts = { "+": 0, "-": 0, "~": 0 };
    let noLoc = 0;
    const html = rows.map((r) => {
      if (r.sep) return '<div class="call-sep"></div>';
      if (r.mark in counts) counts[r.mark]++;
      if (r.mark !== " " && !r.loc) noLoc++;
      let guide = "";
      for (let d = 1; d <= r.depth; d++) guide += d === r.depth ? (r.last[d] ? "└─ " : "├─ ") : r.last[d] ? "   " : "│  ";
      const name = esc(r.body).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      const cls = { "+": "add", "-": "rem", "~": "mod", "?": "opt", " ": "ctx" }[r.mark];
      let excerpt = "", abs = null;
      if (r.loc) {
        const [path, lineStr] = r.loc.split(":");
        if (lineStr !== undefined && !/^[1-9]\d*$/.test(lineStr)) errors.push(`${at}: "${r.body}" @ ${r.loc}; write @ path:line with a line number from 1`);
        const line = +lineStr || 0;
        const f = readFile(path);
        if (f.missing && (r.mark === "+" || r.mark === "?")) { /* a new file */ }
        else if (f.error) errors.push(`${at}: "${r.body}" @ ${r.loc}: ${f.error}`);
        else {
          const all = f.text.replace(/\n$/, "").split("\n");
          if (line > all.length) (r.mark === "+" ? warnings : errors).push(`${at}: "${r.body}" @ ${r.loc}, but ${path} has ${all.length} lines`);
          else if (line) {
            const a = Math.max(1, line - 5), b = Math.min(all.length, line + 5);
            const slice = all.slice(a - 1, b);
            if (!SECRET_TEXT.test(slice.join("\n"))) {
              abs = f.abs; filesRead.add(path);
              excerpt = `<div class="excerpt"><p class="excerpt-head">${fileLink(`${path}:${line}`, abs, line)}<span class="code-lines">L${a}–${b}</span></p><div class="code-body"><table><tbody>${codeRows(slice, { start: a, target: line, lang: extname(path).slice(1) })}</tbody></table></div></div>`;
            }
          }
        }
      }
      const row = `<span class="rail">${r.mark === "-" ? "−" : r.mark === " " ? "·" : r.mark}</span><span class="guide">${guide}</span><span class="nm">${name}</span>${r.note ? `<span class="note">${esc(r.note)}</span>` : ""}${r.loc ? `<span class="loc">${esc(r.loc)}</span>` : ""}`;
      return excerpt ? `<details class="call-x"><summary class="call ${cls}">${row}</summary>${excerpt}</details>` : `<div class="call ${cls}">${row}</div>`;
    }).join("");
    if (!marked.length) warnings.push(`${at}: no + − ~ ? rows; mark what changes`);
    if (noLoc > 2) warnings.push(`${at}: ${noLoc} marked rows have no "@ path:line"`);
    if (real.length > 18) warnings.push(`${at}: ${real.length} rows; keep a call tree under about 15`);
    return `<figure class="calls"><figcaption class="calls-head"><span class="calls-kind">calls</span>${n.attrs.title ? `<span class="calls-title">${esc(n.attrs.title)}</span>` : ""}<span class="calls-counts"><b class="add">+${counts["+"]}</b> <b class="rem">−${counts["-"]}</b> <b class="mod">~${counts["~"]}</b></span></figcaption><div class="calls-rows">${html}</div></figure>`;
  }

  function expandMock(n) {
    const at = where(n);
    const w = +(n.attrs.w || 440);
    if (w > 640) warnings.push(`${at}: w="${w}"; draw the smallest region that makes the point (≤ 480)`);
    const pins = kids(n).filter((k) => k.name === "ve-pin");
    for (const p of pins) p.html = "";
    const content = inner(n);
    const marks = new Set([...content.matchAll(/data-pin\s*=\s*["']?([^"'\s>]+)/g)].map((m) => m[1]));
    for (const p of pins) if (!marks.has(p.attrs.n)) errors.push(`${where(p)}: n="${p.attrs.n}" matches no data-pin inside the mock`);
    const list = pins.length ? `<ol class="mock-pins">${pins.map((p) => `<li value="${esc(p.attrs.n)}">${inner(p).trim()}</li>`).join("")}</ol>` : "";
    return `<figure class="mock">${n.attrs.label ? `<p class="mock-label">${esc(n.attrs.label)}</p>` : ""}<div class="mock-stage"><div class="mock-host" style="width:${w}px"><template shadowrootmode="open"><style>${MOCK_CSS}</style><div class="root">${content}</div></template></div></div>${list}</figure>`;
  }

  function expandAsk(n) {
    const at = where(n);
    const id = n.attrs.id;
    if (!id || !/^[\w-]+$/.test(id)) errors.push(`${at}: needs id="word" (letters, digits, - or _)`);
    else if (askIds.has(id)) errors.push(`${at}: id="${id}" is already used at ${askIds.get(id)}`);
    askIds.set(id, at);
    const q = n.attrs.q || "";
    if (!q) errors.push(`${at}: needs q="the question"`);
    else if (words(q) > 15) warnings.push(`${at}: the question is ${words(q)} words; keep it to about 15`);
    const multi = "multi" in n.attrs;
    const opts = kids(n).filter((k) => k.name === "ve-opt");
    if (opts.length < 2) errors.push(`${at}: needs at least two <ve-opt>`);
    const defaults = opts.filter((o) => "default" in o.attrs);
    if (!multi && defaults.length !== 1) errors.push(`${at}: mark exactly one <ve-opt default>, the option you would build`);
    const values = new Set();
    for (const o of opts) {
      if (!o.attrs.value) errors.push(`${where(o)}: needs value=""`);
      else if (values.has(o.attrs.value)) errors.push(`${where(o)}: value="${o.attrs.value}" is used twice`);
      values.add(o.attrs.value);
      for (const no of (o.attrs.removes || "").split(/\s+/).filter(Boolean)) if (!claimNos.has(no)) errors.push(`${where(o)}: removes="${no}", but there is no claim ${no}`);
      if (o.attrs.note && words(o.attrs.note) > 12) warnings.push(`${where(o)}: note is ${words(o.attrs.note)} words; keep it to about 12`);
    }
    const row = opts.every((o) => textOf(o).trim().length <= 18 && !o.attrs.note && !o.attrs.removes);
    const body = opts.map((o) => {
      const cost = [];
      for (const [k, sign, word] of [["new", "+", "new"], ["changed", "~", "changed"], ["deleted", "−", "deleted"]]) {
        const v = +(o.attrs[k] || 0);
        if (v) cost.push(`${v > 0 ? sign : "−"}${Math.abs(v)} ${word} file${Math.abs(v) === 1 ? "" : "s"}`);
      }
      for (const no of (o.attrs.removes || "").split(/\s+/).filter(Boolean)) cost.push(`<span class="goes">claim ${esc(no)} goes</span>`);
      const data = ["new", "changed", "deleted", "removes"].filter((k) => o.attrs[k]).map((k) => ` data-${k}="${esc(o.attrs[k])}"`).join("");
      const def = "default" in o.attrs;
      return `<label class="opt"><input type="${multi ? "checkbox" : "radio"}" name="${esc(id)}" value="${esc(o.attrs.value ?? "")}"${def ? " checked" : ""}${data}><span class="opt-body"><span class="opt-label">${inner(o).trim()}</span>${def ? '<span class="sug">Suggested</span>' : ""}${o.attrs.note ? `<small>${esc(o.attrs.note)}</small>` : ""}${cost.length ? `<span class="opt-cost">${cost.join(" · ")}</span>` : ""}</span></label>`;
    }).join("");
    return `<fieldset class="ask${row ? " row" : ""}" id="ask-${esc(id)}" data-ask="${esc(id)}"><legend class="ask-n">Decision <b>${n.k}</b> of ${asks.length}</legend><p class="ask-q">${esc(q)}</p><div class="ask-opts">${body}</div></fieldset>`;
  }

  function expandFiles(n) {
    const counts = { "+": 0, "~": 0, "-": 0 };
    const items = [];
    for (const raw of dedent(textOf(n)).split("\n")) {
      if (!raw.trim()) continue;
      const m = raw.trim().match(/^([+~-])\s+(\S+)(?:\s+#\s+(.*))?$/);
      if (!m) { errors.push(`${where(n)}: "${raw.trim()}"; write "+ path", "~ path", or "- path", with an optional "# note"`); continue; }
      counts[m[1]]++;
      const f = readFile(m[2]);
      // a new file need not exist yet, but every path must stay inside the repository
      if (relative(realRoot, resolve(realRoot, m[2])).startsWith("..") || /outside/.test(f.error ?? "")) errors.push(`${where(n)}: ${m[1]} ${m[2]}: outside ${realRoot}`);
      else if (m[1] !== "+" && f.missing) errors.push(`${where(n)}: ${m[1]} ${m[2]}: not found under ${realRoot}`);
      items.push(`<li class="${{ "+": "add", "~": "mod", "-": "rem" }[m[1]]}"><span class="mk">${m[1] === "-" ? "−" : m[1]}</span><span class="path">${esc(m[2])}</span>${m[3] ? `<span class="note">${esc(m[3])}</span>` : ""}</li>`);
    }
    const total = counts["+"] + counts["~"] + counts["-"];
    const part = (k, sign, word, cls) => `<span class="${cls}"${counts[k] ? "" : " hidden"}><b data-k="${word}">${sign}${counts[k]}</b> ${word}</span>`;
    return `<div class="files" data-new="${counts["+"]}" data-changed="${counts["~"]}" data-deleted="${counts["-"]}"><p class="stat"><span class="stat-tag">Proposed</span><b data-k="total">${total} file${total === 1 ? "" : "s"}</b>${part("+", "+", "new", "add")}${part("~", "~", "changed", "mod")}${part("-", "−", "deleted", "rem")}</p><details class="file-map"><summary>File map</summary><ul>${items.join("")}</ul></details></div>`;
  }

  const expandQuote = (n) => `<blockquote class="quote"><p class="quote-head"><span class="via">${esc(n.attrs.via || "source")}</span>${n.attrs.from ? ` <b>${esc(n.attrs.from)}</b>` : ""}${n.attrs.at ? ` <span class="at">${n.attrs.href ? `<a href="${esc(n.attrs.href)}">${esc(n.attrs.at)}</a>` : esc(n.attrs.at)}</span>` : ""}</p><div class="quote-body">${inner(n).trim()}</div></blockquote>`;
  const expandWhy = (n) => {
    const count = kids(n).filter((k) => k.name === "ve-quote").length;
    return `<details class="why"><summary>Why · ${count} request${count === 1 ? "" : "s"}</summary>${inner(n)}</details>`;
  };
  const expandRevision = (n) => `<section class="revision" aria-label="What changed"><p class="ve-label caps">Version ${esc(n.attrs.v || "2")} · changed since your answers</p><ul>${inner(n).trim()}</ul></section>`;

  /* a diagram from boxes on a grid and arrows between them; the layout is computed here, so no coordinates are written by hand */
  const W = 140, H = 64, GX = 84, GY = 56, PAD = 16; // three columns come out near the 560×340 hero
  const ifAttrs = (k, cls = "") => `${k.attrs["data-if"] ? ` data-if="${esc(k.attrs["data-if"])}"` : ""}${cls || k.ifOff ? ` class="${cls}${k.ifOff ? `${cls ? " " : ""}is-if-off` : ""}"` : ""}`;
  const flags = (k, base) => [base, ...["key", "new", "gone", "hot", "async"].filter((f) => f in k.attrs).map((f) => `is-${f}`)].join(" ");
  const refOf = (k) => {
    const nos = (k.attrs.claim || "").split(/\s+/).filter(Boolean);
    for (const no of nos) if (!claimNos.has(no)) errors.push(`${where(k)}: claim="${no}", but there is no claim ${no}`);
    return nos.length ? ` data-ref="${nos.map((no) => `claim-${esc(no)}`).join(" ")}"` : "";
  };
  function expandFlow(n) {
    const boxes = new Map(), edges = [];
    for (const k of kids(n)) {
      if (k.name === "ve-node") {
        const m = (k.attrs.at || "").match(/^(\d+(?:\.5)?)[\s,]+(\d+(?:\.5)?)$/);
        if (!k.attrs.id || !m) errors.push(`${where(k)}: needs id="name" and at="column row", for example at="2 1"`);
        else if (boxes.has(k.attrs.id)) errors.push(`${where(k)}: id="${k.attrs.id}" is used twice`);
        else boxes.set(k.attrs.id, { k, x: PAD + (m[1] - 1) * (W + GX), y: PAD + (m[2] - 1) * (H + GY) });
      } else if (k.name === "ve-edge") edges.push(k);
      else errors.push(`${where(k)}: only <ve-node> and <ve-edge> belong in <ve-flow>`);
    }
    for (const e of edges) for (const end of ["from", "to"]) if (!boxes.has(e.attrs[end])) errors.push(`${where(e)}: ${end}="${e.attrs[end] ?? ""}" names no <ve-node>`);
    if (!n.attrs.label) warnings.push(`${where(n)}: add label="…", one sentence a screen reader can read instead of the picture`);
    if (!boxes.size) { errors.push(`${where(n)}: needs at least one <ve-node>`); return ""; }
    const pairs = new Set(edges.map((e) => `${e.attrs.from}>${e.attrs.to}`));
    const edgeSvg = edges.filter((e) => boxes.has(e.attrs.from) && boxes.has(e.attrs.to) && e.attrs.from !== e.attrs.to).map((e) => {
      const a = boxes.get(e.attrs.from), b = boxes.get(e.attrs.to);
      // two arrows between the same boxes run side by side instead of on top of each other
      const off = pairs.has(`${e.attrs.to}>${e.attrs.from}`) ? (e.attrs.from < e.attrs.to ? -12 : 12) : 0;
      const [ax, ay, bx, by] = [a.x + W / 2, a.y + H / 2, b.x + W / 2, b.y + H / 2];
      const x1 = bx > ax ? a.x + W : a.x, y2 = by > ay ? b.y : b.y + H;
      let d, mx, my, vertical = false;
      if (ay === by) { const x2 = bx > ax ? b.x : b.x + W; d = `M${x1} ${ay + off}H${x2}`; mx = (x1 + x2) / 2; my = ay + off; }
      else if (ax === bx) { const y1 = by > ay ? a.y + H : a.y; d = `M${ax + off} ${y1}V${y2}`; mx = ax + off; my = (y1 + y2) / 2; vertical = true; }
      else { d = `M${x1} ${ay + off}H${bx + off}V${y2}`; mx = (x1 + bx) / 2; my = ay + off; } // out of the side, then into the top or bottom
      const ref = refOf(e);
      const label = e.attrs.label ? `<text class="ve-el${vertical ? " r" : ""}"${ref} x="${vertical ? mx + 8 : mx}" y="${vertical ? my + 5 : off > 0 ? my + 17 : my - 9}">${esc(e.attrs.label)}</text>` : "";
      return `<g${ifAttrs(e)}><path class="${flags(e, "ve-e")}"${ref} d="${d}"/>${label}${"gone" in e.attrs ? `<text class="ve-x" x="${mx}" y="${my}">✕</text>` : ""}</g>`;
    });
    const called = new Set();
    const nodeSvg = [], callouts = [];
    for (const { k, x, y } of boxes.values()) {
      const db = k.attrs.shape === "db", subs = kids(k).filter((s) => s.name === "small");
      if (k.attrs.sub) subs.unshift({ attrs: {}, children: [{ text: esc(k.attrs.sub) }] });
      const title = k.children.filter((c) => c.name !== "small").map(textOf).join("").trim();
      const ty = (subs.length ? 25 : 32) + (db ? 6 : 0);
      const shape = db ? `<path class="sh" d="M0 8V56A${W / 2} 8 0 0 0 ${W} 56V8"/><ellipse class="sh lid" cx="${W / 2}" cy="8" rx="${W / 2}" ry="8"/>` : `<rect class="sh" width="${W}" height="${H}" rx="6"/>`;
      // <small data-if="…"> lets one box show a different line under each answer
      const subSvg = subs.map((s) => `<text${ifAttrs(s, hasClass(s, "is-if-off") ? "sub is-if-off" : "sub")} x="${W / 2}" y="${ty + 21}">${esc(textOf(s).trim())}</text>`).join("");
      nodeSvg.push(`<g${ifAttrs(k, flags(k, "ve-n"))}${refOf(k)} transform="translate(${x} ${y})">${shape}<text x="${W / 2}" y="${ty}">${esc(title)}</text>${subSvg}</g>`);
      // each claim gets one numbered callout, on the first box that names it
      const fresh = (k.attrs.claim || "").split(/\s+/).filter((no) => claimNos.has(no) && !called.has(no));
      // the callout shows and hides with its box
      fresh.forEach((no, i) => { called.add(no); callouts.push(`<g${ifAttrs(k, "ve-co")} data-ref="claim-${esc(no)}" transform="translate(${x + i * 26} ${y})"><circle r="11"/><text>${esc(no)}</text></g>`); });
    }
    const width = Math.max(...[...boxes.values()].map((b) => b.x)) + W + PAD, height = Math.max(...[...boxes.values()].map((b) => b.y)) + H + PAD;
    return `<div class="frame"><svg class="ve-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(n.attrs.label || "")}">${edgeSvg.join("")}${nodeSvg.join("")}${callouts.join("")}</svg></div>`;
  }

  const CHIP = { built: ["ok", "Built"], changed: ["warn", "Changed"], dropped: ["risk", "Dropped"] };
  function expandClaim(c) {
    if (c.level === undefined) return ""; // misplaced; reported above
    const own = [], sub = [];
    for (const k of c.children) (k.name === "ve-claim" ? sub : own).push(k);
    if (c.p) c.p.html = "";
    const askCount = find(c, (n) => n.name === "ve-ask").length;
    const { evidence, status, rev, check, aux } = c.attrs;
    const chip = CHIP[status]; // undefined for an invalid status, which was already reported
    const chips = [
      evidence === "guess" ? '<span class="chip warn">guess</span>' : evidence === "inferred" ? '<span class="chip info">inferred</span>' : "",
      rev ? `<span class="chip info">changed in v${esc(rev)}</span>` : "",
      chip ? `<span class="chip ${chip[0]}">${chip[1]}</span>` : "",
      askCount ? `<span class="c-asks">${askCount} decision${askCount === 1 ? "" : "s"}</span>` : "",
    ].join("");
    const claimHtml = c.p ? inner(c.p).trim() : `<code>${esc(c.attrs.at)}</code>`;
    const atLine = c.attrs.at && c.p ? `<p class="c-at">${fileLink(c.attrs.at, c.atAbs, c.attrs.at.split(":")[1])}</p>` : c.attrs.at && c.atAbs ? `<p class="c-at">${fileLink("open in editor", c.atAbs, c.attrs.at.split(":")[1])}</p>` : "";
    const guess = evidence === "guess" ? `<fieldset class="guess" data-guess="${esc(c.no)}"><legend>I could not confirm this in the code. Is it right?</legend><label><input type="radio" name="guess:${esc(c.no)}" value="right"> Right</label><label><input type="radio" name="guess:${esc(c.no)}" value="wrong"> Wrong</label></fieldset>` : "";
    const checkLine = check ? `<p class="c-check"><span class="ve-label">Done when</span> ${esc(check).replace(/`([^`]+)`/g, "<code>$1</code>")}</p>` : "";
    const statusLine = chip && (c.attrs.note || c.attrs.ref) ? `<p class="c-status"><span class="chip ${chip[0]}">${chip[1]}</span> ${esc(c.attrs.note || "")}${c.attrs.ref ? ` <code>${esc(c.attrs.ref)}</code>` : ""}</p>` : "";
    const id = `claim-${(c.no || aux).replace(/\./g, "-")}`;
    const data = [["no", c.no], ["l", c.level], ["aux", aux], ["evidence", evidence], ["status", status], ["rev", rev]].filter(([, v]) => v).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
    const num = aux === "scope" ? "—" : aux ? "∗" : c.no;
    return `<details class="claim" id="${esc(id)}"${data}><summary${c.no ? ` data-ref="claim-${esc(c.no)}"` : ""}><span class="c-no">${esc(num)}</span><span class="c-text">${claimHtml}</span><span class="c-meta">${chips}</span></summary><div class="c-body">${atLine}${own.map(serialize).join("")}${guess}${checkLine}${statusLine}${sub.map(serialize).join("")}</div></details>`;
  }

  const EXPAND = { "ve-code": expandCode, "ve-calls": expandCalls, "ve-mock": expandMock, "ve-flow": expandFlow, "ve-ask": expandAsk, "ve-files": expandFiles, "ve-quote": expandQuote, "ve-why": expandWhy, "ve-revision": expandRevision, "ve-claim": expandClaim };
  const PARTS = ["ve-plan", "ve-pin", "ve-opt", "ve-node", "ve-edge"];

  /* answers shown or hidden by data-if start in the state the defaults give. This runs before expansion,
     because expansion freezes each subtree into a string. */
  const defaultsOf = Object.fromEntries(asks.map((a) => [a.attrs.id, kids(a).filter((o) => o.name === "ve-opt" && "default" in o.attrs).map((o) => o.attrs.value)]));
  for (const n of find(doc, (x) => "data-if" in x.attrs)) {
    const conds = n.attrs["data-if"].split(/\s*&&\s*/);
    let on = true;
    for (const cond of conds) {
      const m = cond.match(/^([\w-]+)\s*(!=|=)\s*(.+)$/);
      if (!m) { errors.push(`${where(n)}: data-if="${cond}"; write data-if="decision=value" (or !=, joined with &&)`); continue; }
      const ask = asks.find((a) => a.attrs.id === m[1]);
      if (!ask) { errors.push(`${where(n)}: data-if names "${m[1]}", but no <ve-ask id="${m[1]}"> exists`); continue; }
      if (!kids(ask).some((o) => o.name === "ve-opt" && o.attrs.value === m[3].trim())) errors.push(`${where(n)}: data-if value "${m[3].trim()}" is not an option of "${m[1]}"`);
      const hit = defaultsOf[m[1]].includes(m[3].trim());
      if (m[2] === "=" ? !hit : hit) on = false;
    }
    if (["ve-plan", "ve-pin", "ve-opt"].includes(n.name)) errors.push(`${where(n)}: data-if does not work on <${n.name}>; put it on an element inside or around it`);
    else if (n.name.startsWith("ve-")) n.ifOff = !on;
    else if (!on) addClass(n, "is-if-off");
  }
  // a tag's data-if moves onto the element it expands to, so the reader's answers can still show or hide it
  const carryIf = (n, html) => (!n.attrs["data-if"] || !html ? html : html.replace(/^<([a-z][\w-]*)([^>]*)>/i, (_, tag, rest) => {
    const cls = rest.match(/\sclass="([^"]*)"/);
    return `<${tag}${ifAttrs(n, cls?.[1] ?? "")}${cls ? rest.replace(cls[0], "") : rest}>`;
  }));
  const ves = find(doc, (n) => n.name.startsWith("ve-"));
  for (const n of ves) if (!(n.name in EXPAND) && !PARTS.includes(n.name)) errors.push(`${where(n)}: unknown tag; known: ${Object.keys(EXPAND).concat(PARTS).join(" ")}`);
  for (const n of ves.slice().reverse()) if (EXPAND[n.name]) n.html = carryIf(n, EXPAND[n.name](n));

  /* hero: the answer as a picture, its callouts linked to the claims */
  const hero = find(doc, (n) => n.name === "figure" && hasClass(n, "hero"))[0];
  if (!hero) warnings.push('no <figure class="hero">; open on the change as a picture with ① ② ③ linked to the claims');
  else {
    const refs = new Set(find(hero, (n) => n.attrs["data-ref"] || n.attrs.claim).flatMap((n) => (n.attrs["data-ref"] ?? "").split(/\s+/).concat((n.attrs.claim ?? "").split(/\s+/).filter(Boolean).map((no) => `claim-${no}`))).filter((r) => r.startsWith("claim-")));
    for (const r of refs) if (!claimNos.has(r.slice(6))) errors.push(`hero: data-ref="${r}", but there is no claim ${r.slice(6)}`);
    for (const c of topClaims) if (!refs.has(`claim-${c.no}`)) warnings.push(`hero: nothing carries data-ref="claim-${c.no}"; mark the parts claim ${c.no} changes`);
    const vb = find(hero, (n) => n.name === "svg")[0]?.attrs.viewbox?.split(/[\s,]+/).map(Number);
    if (vb?.length === 4 && vb[3] / vb[2] > 0.72) warnings.push(`hero: viewBox ${vb[2]}×${vb[3]} is tall; keep it near 560×340 so the tree stays in view`);
  }

  /* layout: header, then the tree beside the sticky hero */
  const htmlNode = find(doc, (n) => n.name === "html")[0];
  const head = find(doc, (n) => n.name === "head")[0];
  const body = find(doc, (n) => n.name === "body")[0];
  if (!body) errors.push("missing <body>");
  if (errors.length) return { errors, warnings, files: [...filesRead] };

  const header = find(body, (n) => n.name === "header")[0];
  const take = (n) => { if (!n) return ""; const s = serialize(n); n.html = ""; return s; };
  // the claims go into the page without the <ve-plan> wrapper, so a rendered page never reads as a plan source
  const headerHtml = take(header), heroHtml = take(hero), planHtml = inner(plan);
  plan.html = "";
  const mainNode = kids(body).length === 1 && kids(body)[0].name === "main" ? kids(body)[0] : body;
  const rest = inner(mainNode).trim();

  const guesses = claims.filter((c) => c.attrs.evidence === "guess").length;
  const checked = claims.filter((c) => c.attrs.check);
  const statuses = claims.filter((c) => c.attrs.status);
  // the saved-answers key includes this, so each revision starts clean
  const version = Math.max(1, ...find(doc, (n) => n.name === "ve-revision").map((n) => +n.attrs.v || 2), ...claims.map((c) => +c.attrs.rev || 1));
  const proseWords = find(plan, (n) => n.name === "p" || n.name === "li").reduce((s, n) => s + words(textOf(n)), 0);
  const minutes = Math.max(1, Math.round(proseWords / 220 + asks.length * 0.3 + claims.length * 0.15));
  const meta = [
    `${claims.filter((c) => c.no).length} claims`,
    asks.length ? `${asks.length} decision${asks.length === 1 ? "" : "s"}` : "",
    guesses && !statuses.length ? `<span class="guesses">${guesses} guess${guesses === 1 ? "" : "es"} to check</span>` : "",
    `~${minutes} min`,
  ].filter(Boolean).join(" · ");
  let progress = "";
  if (statuses.length) {
    const tally = { built: 0, changed: 0, dropped: 0 };
    for (const c of statuses) tally[c.attrs.status]++;
    const total = claims.filter((c) => c.attrs.check || c.attrs.status).length;
    const seg = (k) => (tally[k] ? `<i class="${k}" style="flex:${tally[k]}"></i>` : "");
    progress = `<p class="progress"><span class="bar" role="img" aria-label="${tally.built} of ${total} built, ${tally.changed} changed, ${tally.dropped} dropped">${seg("built")}${seg("changed")}${seg("dropped")}${total > statuses.length ? `<i class="todo" style="flex:${total - statuses.length}"></i>` : ""}</span>${tally.built} of ${total} built${tally.changed ? ` · ${tally.changed} changed` : ""}${tally.dropped ? ` · ${tally.dropped} dropped` : ""}</p>`;
  }
  const done = checked.length ? `<section class="done" aria-label="Done when"><p class="ve-label caps">Done when</p><table><thead><tr><th>Claim</th><th>Check</th><th>Status</th></tr></thead><tbody>${checked.map((c) => `<tr><td><a href="#claim-${esc((c.no || c.attrs.aux).replace(/\./g, "-"))}">${esc(c.no || c.label)}</a> ${esc(c.text)}</td><td>${esc(c.attrs.check).replace(/`([^`]+)`/g, "<code>$1</code>")}</td><td>${c.attrs.status ? `<span class="chip ${CHIP[c.attrs.status][0]}">${CHIP[c.attrs.status][1]}</span>` : '<span class="ve-label">planned</span>'}</td></tr>`).join("")}</tbody></table></section>` : "";

  const keepHead = head ? kids(head).filter((k) => !(k.name === "meta" && ("charset" in k.attrs || k.attrs.name === "viewport")) && k.name !== "title").map(serialize).join("\n") : "";
  const hasIcon = head && kids(head).some((k) => k.name === "link" && /icon/.test(k.attrs.rel || ""));
  const css = readFileSync(join(here, "plan.css"), "utf8");
  const js = readFileSync(join(here, "plan.js"), "utf8").replace(/<\/script/gi, "<\\/script");
  const lang = htmlNode?.attrs.lang || "en";
  const bodyAttrs = body.openRaw.replace(/^<body/i, "").replace(/>$/, "");
  const html = `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(textOf(titleNode).trim())}</title>
${hasIcon ? "" : FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style data-ve-plan>
${css}
</style>
${keepHead}
</head>
<body${bodyAttrs}>
${DEFS}
<main class="plan-page${hero ? "" : " no-hero"}" data-v="${version}"${sendBack ? " data-send-back" : ""}>
${headerHtml}
<div class="plan-grid">
<div class="plan-col">
<div class="plan-meta"><p class="counts">${meta}</p>${progress}<p class="tools"></p></div>
<section class="plan" aria-label="Plan">${planHtml}</section>
${done}
</div>
${hero ? `<aside class="plan-hero">${heroHtml}</aside>` : ""}
</div>
${rest}
</main>
<script data-ve-plan>
${js}
</script>
</body>
</html>
`;
  const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const summary = [count(claims.filter((c) => c.no).length, "claim"), count(asks.length, "decision"), count(guesses, "guess", "guesses"), count(checked.length, "check"), statuses.length ? `${statuses.length} with status` : "", `${count(filesRead.size, "file")} read`].filter(Boolean).join(" · ");
  return { html, errors, warnings, files: [...filesRead], summary };
}

/**
 * The plan step shared by the Pi tool and the MCP server. Returns null for an ordinary page. A plan source becomes the
 * page, renamed from <name>.src.html, with the source kept beside it. A page already rendered passes through untouched:
 * hosts must not run their display-math escape on plan pages, because `$$` in plan.js and in cited code would break.
 */
export function renderPlanForHost(html, { root, filename, sendBack = false }) {
  if (!hasPlan(html)) return /<script data-ve-plan>/.test(html) ? { html, filename, note: "" } : null;
  const r = renderPlan(html, { root, sendBack });
  if (r.errors.length) throw new Error(`The plan has ${r.errors.length} error(s); nothing was written:\n${r.errors.map((e) => `- ${e}`).join("\n")}`);
  const page = filename.replace(/\.src(\.html?)$/i, "$1");
  const source = page.replace(/\.html?$/i, ".src.html");
  const warned = r.warnings.length ? `\nWarnings:\n${r.warnings.map((w) => `- ${w}`).join("\n")}` : "";
  return { html: r.html, filename: page, source, note: ` Plan: ${r.summary}. Source kept beside it as ${source}; edit it and render again for revisions and the build receipt.${warned}` };
}

const FAVICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%230d1520'/%3E%3Cpath d='M18 20h28M18 32h20M18 44h12' stroke='%23ffb547' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">`;

// Shared SVG defs for hand-drawn figures: one arrowhead that follows each edge's color, and the node fill.
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="ve-ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker><linearGradient id="ve-node" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--node-top)"/><stop offset="1" style="stop-color:var(--surface)"/></linearGradient></defs></svg>`;

// Mock UI lives in a shadow root, so page styles never reach it. These classes save writing CSS for common parts.
const MOCK_CSS = `:host{all:initial;display:block}*,*::before,*::after{box-sizing:border-box}
.root{font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#17191c}
.ui{background:#fff;border:1px solid #d9dde3;border-radius:10px;overflow:hidden}
.hd{display:flex;gap:8px;align-items:baseline;padding:10px 14px;border-bottom:1px solid #eceef1;font-weight:600}.hd small{color:#6b7280;font-weight:400}
.row{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f0f1f3}.row:last-child{border-bottom:0}
.muted{color:#6b7280}.small{font-size:12.5px}.ok{color:#1c7443;font-weight:600}.bad{color:#b0341e;font-weight:600}
.btn{display:inline-block;font-weight:600;font-size:13px;padding:6px 11px;border-radius:7px;border:1px solid #d9dde3;background:#fff;color:#17191c}.btn.pri{background:#17191c;color:#fff;border-color:#17191c}.btn.danger{color:#b0341e}
.ft{display:flex;gap:8px;justify-content:flex-end;padding:10px 14px;border-top:1px solid #eceef1;background:#f8f9fa}
.is-if-off{display:none!important}
[data-pin]{position:relative}[data-pin]::after{content:attr(data-pin);position:absolute;top:-11px;right:-11px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--accent,#c06a00);color:var(--bg,#fff);font:600 12px/20px ui-monospace,monospace;text-align:center;box-shadow:0 0 0 2px var(--surface,#fff)}`;

/* ── CLI ── */
function openFile(path) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [path]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", path]] : ["xdg-open", [path]];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const value = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const input = argv.find((a, i) => !a.startsWith("-") && !["-o", "--root"].includes(argv[i - 1]));
  if (!input) {
    console.error("usage: node render.mjs plan.src.html [-o plan.html] [--root <repo>] [--lint] [--open]");
    process.exit(2);
  }
  const output = value("-o") ?? (/\.src\.html?$/i.test(input) ? input.replace(/\.src(\.html?)$/i, "$1") : null);
  if (!output && !flag("--lint")) {
    console.error("name the source <name>.src.html, or pass -o <name>.html");
    process.exit(2);
  }
  const result = renderPlan(readFileSync(input, "utf8"), { root: value("--root") ?? process.cwd() });
  for (const w of result.warnings) console.log(`  ⚠ ${w}`);
  for (const e of result.errors) console.log(`  ✗ ${e}`);
  if (result.errors.length) {
    console.log(`✗ ${result.errors.length} error(s), ${result.warnings.length} warning(s); nothing written`);
    process.exit(1);
  }
  if (result.files.length) console.log(`  code from ${result.files.length} file(s) is now in the page: ${result.files.join(", ")}`);
  if (flag("--lint")) { console.log(`✓ ${result.summary}`); return; }
  const temp = `${output}.${process.pid}.tmp`;
  writeFileSync(temp, result.html);
  renameSync(temp, output);
  console.log(`✓ ${resolve(output)}  ${result.summary}${result.warnings.length ? ` · ${result.warnings.length} warning(s)` : ""}`);
  if (flag("--open")) openFile(resolve(output));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
