// <ve-flow>: boxes on a grid and arrows between them. The layout is computed here, so no coordinates are written by hand.
// Plans and ordinary pages share it; ctx says how a part links to the rest of its page:
//   ref(k)              attributes for a box or arrow (plans: claim refs; pages: data-ref and data-s as written)
//   callout(k, x, y)    marks drawn over a box (plans: one numbered callout per claim)
//   page                pages: an arrow with data-s also gets a replay token, and the drawing keeps its labels between 12 px and 1.3× as rendered
//   root, models        a <script type="text/plain" model> child is walked from root's code (models: false refuses it; references/machines.md)
import { esc, hasClass, kids, textOf } from "./html.mjs";
import { drawModel } from "./machine.mjs";

const W = 140, H = 64, GY = 56, PAD = 16;
const CH = 8.4; // one mono character of a 14-unit label
export const ifAttrs = (k, cls = "") => `${k.attrs["data-if"] ? ` data-if="${esc(k.attrs["data-if"])}"` : ""}${cls || k.ifOff ? ` class="${cls}${k.ifOff ? `${cls ? " " : ""}is-if-off` : ""}"` : ""}`;
const flags = (k, base) => [base, ...["key", "new", "gone", "hot", "async", "breaks", "may-break", "bug-path"].filter((f) => f in k.attrs).map((f) => `is-${f}`)].join(" ");

export function expandFlow(n, { errors, warnings, where, ref, callout = () => "", page = false, root = process.cwd(), models = true }) {
  // plans keep three columns near the 560×340 hero; a page has room for longer arrow labels between columns
  const GX = page ? 124 : 84;
  const boxes = new Map(), edges = [], scripts = [];
  for (const k of kids(n)) {
    if (k.name === "ve-node") {
      const m = (k.attrs.at || "").match(/^(\d+(?:\.5)?)[\s,]+(\d+(?:\.5)?)$/);
      if (!k.attrs.id || !m) errors.push(`${where(k)}: needs id="name" and at="column row", for example at="2 1"`);
      else if (boxes.has(k.attrs.id)) errors.push(`${where(k)}: id="${k.attrs.id}" is used twice`);
      else boxes.set(k.attrs.id, { k, x: PAD + (m[1] - 1) * (W + GX), y: PAD + (m[2] - 1) * (H + GY) });
    } else if (k.name === "ve-edge") edges.push(k);
    else if (k.name === "script" && "model" in k.attrs) scripts.push(k);
    else errors.push(`${where(k)}: only <ve-node>, <ve-edge>, and one <script type="text/plain" model> belong in <ve-flow>`);
  }
  for (const e of edges) for (const end of ["from", "to"]) if (!boxes.has(e.attrs[end])) errors.push(`${where(e)}: ${end}="${e.attrs[end] ?? ""}" names no <ve-node>`);
  if (!n.attrs.label) warnings.push(`${where(n)}: add label="…", one sentence a screen reader can read instead of the picture`);
  if (!boxes.size) { errors.push(`${where(n)}: needs at least one <ve-node>`); return ""; }
  // a model draws the arrows and sets the steps: the walk replaces what an author would write by hand
  // (a node that failed to place is already an error; walking without it would also call it "not drawn")
  if (scripts.length && !kids(n).some((k) => k.name === "ve-node" && !boxes.has(k.attrs.id))) {
    if (scripts.length > 1) errors.push(`${where(scripts[1])}: one model per <ve-flow>`);
    for (const e of edges) errors.push(`${where(e)}: a flow with a model draws its arrows from the walk; remove this <ve-edge>`);
    for (const { k } of boxes.values()) if ("data-s" in k.attrs) errors.push(`${where(k)}: a flow with a model takes its steps from the walk; remove data-s`);
    const m = drawModel(scripts[0], new Map([...boxes].map(([id, b]) => [id, b.k])), { root, models, where });
    if (m.errors) { errors.push(...m.errors); return ""; }
    for (const [id, attrs] of m.nodes) Object.assign(boxes.get(id).k.attrs, attrs);
    edges.splice(0, edges.length, ...m.edges);
    n.machine = m;
  }
  const pairs = new Set(edges.map((e) => `${e.attrs.from}>${e.attrs.to}`));
  const toks = [];
  const width = Math.max(...[...boxes.values()].map((b) => b.x)) + W + PAD, height = Math.max(...[...boxes.values()].map((b) => b.y)) + H + PAD;
  // a label beside a vertical arrow can reach past the outer boxes; the drawing widens to hold it
  let lo = 0, hi = width;
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
    const r = ref(e);
    // an arrow that appears at a step draws in; one drawn from the start (step 0) just lights
    const draw = page && e.attrs["data-s"] && !/^\s*0\b/.test(e.attrs["data-s"]) ? ' pathLength="1"' : "";
    if (page && e.attrs["data-s"]) toks.push(`<circle class="ve-tok" data-s="${esc(e.attrs["data-s"])}" r="5" style="offset-path: path('${d}')"/>`);
    if (page && e.attrs.label && !vertical && e.attrs.label.length * CH > Math.abs(bx - ax) - W - 8) warnings.push(`${where(e)}: label="${e.attrs.label}" is wider than the gap between its boxes; shorten it`);
    // of two vertical arrows side by side, the left one's label goes on its left, so the labels never cross the other arrow
    const left = vertical && off < 0, lx = vertical ? (left ? mx - 8 : mx + 8) : mx;
    if (vertical && e.attrs.label) { const span = e.attrs.label.length * CH + 4; if (left) lo = Math.min(lo, lx - span); else hi = Math.max(hi, lx + span); }
    const label = e.attrs.label ? `<text class="ve-el${vertical ? (left ? " l" : " r") : ""}"${r} x="${lx}" y="${vertical ? my + 5 : off > 0 ? my + 17 : my - 9}">${esc(e.attrs.label)}</text>` : "";
    return `<g${ifAttrs(e)}><path class="${flags(e, "ve-e")}"${r}${draw} d="${d}"/>${label}${"gone" in e.attrs ? `<text class="ve-x" x="${mx}" y="${my}">✕</text>` : ""}</g>`;
  });
  const nodeSvg = [], callouts = [];
  for (const { k, x, y } of boxes.values()) {
    const db = k.attrs.shape === "db", subs = kids(k).filter((s) => s.name === "small");
    if (k.attrs.sub) subs.unshift({ attrs: {}, children: [{ text: esc(k.attrs.sub) }] });
    const title = k.children.filter((c) => c.name !== "small").map(textOf).join("").trim();
    const ty = (subs.length ? 25 : 32) + (db ? 6 : 0);
    const shape = db ? `<path class="sh" d="M0 8V56A${W / 2} 8 0 0 0 ${W} 56V8"/><ellipse class="sh lid" cx="${W / 2}" cy="8" rx="${W / 2}" ry="8"/>` : `<rect class="sh" width="${W}" height="${H}" rx="6"/>`;
    // <small data-if="…"> lets one box show a different line under each answer
    const subSvg = subs.map((s) => `<text${ifAttrs(s, hasClass(s, "is-if-off") ? "sub is-if-off" : "sub")} x="${W / 2}" y="${ty + 21}">${esc(textOf(s).trim())}</text>`).join("");
    nodeSvg.push(`<g${ifAttrs(k, flags(k, "ve-n"))}${ref(k)} transform="translate(${x} ${y})">${shape}<text x="${W / 2}" y="${ty}">${esc(title)}</text>${subSvg}</g>`);
    callouts.push(callout(k, x, y));
  }
  const x0 = Math.floor(lo), w = Math.ceil(hi) - x0;
  // tokens sit between the arrows and the boxes, so a token enters a box and leaves from the far side
  // on a page, 14-unit labels stay at 12 px or more on narrow screens, and a small drawing does not grow past 1.3×
  const size = page ? ` ve-flow" style="--min: ${Math.ceil((w * 12) / 14)}px; --max: ${Math.round(w * 1.3)}px` : "";
  return `<div class="frame"><svg class="ve-svg${size}" viewBox="${x0} 0 ${w} ${height}" role="img" aria-label="${esc(n.attrs.label || "")}">${edgeSvg.join("")}${toks.join("")}${nodeSvg.join("")}${callouts.join("")}</svg></div>${n.machine?.proof ?? ""}`;
}
