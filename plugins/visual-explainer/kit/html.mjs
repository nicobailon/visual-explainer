// A small HTML tree, shared by the page and plan renderers: enough to find tags and attributes. Untouched parts serialize byte for byte.
const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m));
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const TAG = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=\/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;

function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

export function parseHtml(html) {
  // `strays` holds closing tags that close nothing, which a browser drops without a word
  const root = { name: "#root", attrs: {}, children: [], strays: [] };
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
      if (i > 0) { stack[i].closeRaw = m[0]; stack.length = i; } else { text(m[0]); root.strays.push({ name: m[1].toLowerCase(), pos: m.index }); }
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

export const serialize = (n) => n.html ?? n.text ?? (n.openRaw ?? "") + n.children.map(serialize).join("") + (n.closeRaw ?? "");
export const inner = (n) => n.children.map(serialize).join("");
export const kids = (n) => n.children.filter((c) => c.name);
function* walk(n) { for (const c of n.children ?? []) if (c.name) { yield c; yield* walk(c); } }
export const find = (n, pred) => [...walk(n)].filter(pred);
export const textOf = (n) => (n.text !== undefined ? (n.comment ? "" : decode(n.text)) : n.name === "script" || n.name === "style" ? "" : n.children.map(textOf).join(""));
export const rawText = (n) => n.children.map((c) => c.text ?? "").join("");
export const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
export const hasClass = (n, c) => (n.attrs?.class ?? "").split(/\s+/).includes(c);
export function addClass(n, cls) {
  const m = n.openRaw.match(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  n.openRaw = m ? n.openRaw.replace(m[0], ` class="${esc(`${m[1] ?? m[2]} ${cls}`.trim())}"`) : n.openRaw.replace(/\s*(\/?)>$/, ` class="${cls}"$1>`);
  n.attrs.class = `${n.attrs.class ?? ""} ${cls}`.trim();
}
