// <ve-flow>: boxes on a grid and arrows between them. The layout is computed here, so no coordinates are written by hand.
// Plans and ordinary pages share it; ctx says how a part links to the rest of its page:
//   ref(k)              attributes for a box or arrow (plans: claim refs; pages: data-ref and data-s as written)
//   callout(k, x, y)    marks drawn over a box (plans: one numbered callout per claim)
//   page                pages: an arrow with data-s also gets a replay token, and the drawing keeps its labels between 12 px and 1.3× as rendered
//   root, models        a <script type="text/plain" model> child is walked from root's code (models: false refuses it; references/machines.md)
// A <ve-region> holds the <ve-node>s of one part of the model's state and draws as a dashed boundary around them.
import { esc, hasClass, kids, textOf } from "./html.mjs";
import { drawAuto, drawModel } from "./machine.mjs";

const W = 140, H = 64, GY = 56, PAD = 16;
const RX = 14, RT = 30; // a region's padding beside and below its nodes, and above them, where its label sits; two regions in adjacent rows keep GY − RX − RT apart
const CH = 8.4; // one mono character of a 14-unit label
export const ifAttrs = (k, cls = "") => `${k.attrs["data-if"] ? ` data-if="${esc(k.attrs["data-if"])}"` : ""}${cls || k.ifOff ? ` class="${cls}${k.ifOff ? `${cls ? " " : ""}is-if-off` : ""}"` : ""}`;
const flags = (k, base) => [base, ...["key", "new", "gone", "hot", "async", "breaks", "may-break", "bug-path"].filter((f) => f in k.attrs).map((f) => `is-${f}`)].join(" ");

export function expandFlow(n, { errors, warnings, where, ref, callout = () => "", page = false, root = process.cwd(), models = true }) {
  // plans keep three columns near the 560×340 hero; a page has room for longer arrow labels between columns
  const GX = page ? 124 : 84;
  const boxes = new Map(), edges = [], scripts = [], regions = new Map(), before = errors.length;
  const place = (k, region) => {
    const m = (k.attrs.at || "").match(/^(\d+(?:\.5)?)[\s,]+(\d+(?:\.5)?)$/);
    if (!k.attrs.id || !m) errors.push(`${where(k)}: needs id="name" and at="column row", for example at="2 1"`);
    else if (boxes.has(k.attrs.id)) errors.push(`${where(k)}: id="${k.attrs.id}" is used twice`);
    else { boxes.set(k.attrs.id, { k, x: PAD + (m[1] - 1) * (W + GX), y: PAD + (m[2] - 1) * (H + GY) }); region?.ids.push(k.attrs.id); }
  };
  for (const k of kids(n)) {
    if (k.name === "ve-node") place(k);
    else if (k.name === "ve-region") {
      const g = { k, ids: [] };
      if (!k.attrs.id || regions.has(k.attrs.id)) errors.push(`${where(k)}: needs its own id="part", the part of state() it draws`);
      else regions.set(k.attrs.id, g);
      for (const c of kids(k)) if (c.name === "ve-node") place(c, g); else errors.push(`${where(c)}: only <ve-node> belongs in <ve-region>`);
      if (!kids(k).some((c) => c.name === "ve-node")) errors.push(`${where(k)}: a <ve-region> holds the <ve-node>s of its part; this one has none`);
    } else if (k.name === "ve-edge") edges.push(k);
    else if (k.name === "script" && "model" in k.attrs) { if (scripts.length) errors.push(`${where(k)}: one model per <ve-flow>`); scripts.push(k); }
    else errors.push(`${where(k)}: only <ve-node>, <ve-region>, <ve-edge>, and one <script type="text/plain" model> belong in <ve-flow>`);
  }
  // auto: the whole walk, laid out by Pele; render.mjs draws the Mermaid this leaves on n.auto
  if ("auto" in n.attrs) {
    // a plan has no Pele step to draw it, so it would be an empty exhibit
    if (!page) errors.push(`${where(n)}: auto draws only on a page; in a plan, place the states by hand with <ve-node>`);
    else if (boxes.size || regions.size || edges.length) errors.push(`${where(n)}: auto draws the whole walk; remove the nodes, or drop auto`);
    else if (!scripts.length) errors.push(`${where(n)}: auto draws the walk of one <script type="text/plain" model>; add it`);
    else if (!n.attrs.label) errors.push(`${where(n)}: add label="…", one sentence a screen reader can read instead of the picture`);
    else if (errors.length === before) {
      const a = drawAuto(scripts[0], { root, models, where });
      if (a.errors) errors.push(...a.errors);
      else { n.auto = a; n.machine = { line: a.line }; }
    }
    return "";
  }
  for (const [id, { k }] of regions) if (boxes.has(id)) errors.push(`${where(k)}: id="${id}" is also a <ve-node>; an arrow could not tell them apart`);
  for (const e of edges) for (const end of ["from", "to"]) if (!boxes.has(e.attrs[end])) errors.push(`${where(e)}: ${end}="${e.attrs[end] ?? ""}" names no <ve-node>`);
  if (!n.attrs.label) warnings.push(`${where(n)}: add label="…", one sentence a screen reader can read instead of the picture`);
  if (!boxes.size) { errors.push(`${where(n)}: needs at least one <ve-node>`); return ""; }
  // a model draws the arrows and sets the steps: the walk replaces what an author would write by hand
  // (after a node or region error the drawing is incomplete, and the walk would only repeat it as "not drawn")
  if (scripts.length && errors.length === before) {
    for (const e of edges) errors.push(`${where(e)}: a flow with a model draws its arrows from the walk; remove this <ve-edge>`);
    for (const { k } of boxes.values()) if ("data-s" in k.attrs) errors.push(`${where(k)}: a flow with a model takes its steps from the walk; remove data-s`);
    const m = drawModel(scripts[0], new Map([...boxes].map(([id, b]) => [id, b.k])), { root, models, where, regions });
    if (m.errors) { errors.push(...m.errors); return ""; }
    for (const [id, attrs] of m.nodes) Object.assign(boxes.get(id).k.attrs, attrs);
    edges.splice(0, edges.length, ...m.edges);
    n.machine = m;
  }
  const pairs = new Set(edges.map((e) => `${e.attrs.from}>${e.attrs.to}`));
  const toks = [];
  const lifts = new Map(); // region id → the sides its lifted arrows already leave from
  const width = Math.max(...[...boxes.values()].map((b) => b.x)) + W + PAD, height = Math.max(...[...boxes.values()].map((b) => b.y)) + H + PAD;
  const rects = new Map([...regions].filter(([, g]) => g.ids.length).map(([id, g]) => {
    const bs = g.ids.map((i) => boxes.get(i)), x = Math.min(...bs.map((b) => b.x)) - RX, y = Math.min(...bs.map((b) => b.y)) - RT;
    return [id, { k: g.k, ids: g.ids, x, y, w: Math.max(...bs.map((b) => b.x)) + W + RX - x, h: Math.max(...bs.map((b) => b.y)) + H + RX - y }];
  }));
  // a label beside a vertical arrow can reach past the outer boxes; the drawing widens to hold it
  let lo = 0, hi = width;
  const edgeSvg = edges.filter((e) => (boxes.has(e.attrs.from) || rects.has(e.attrs.from)) && boxes.has(e.attrs.to) && e.attrs.from !== e.attrs.to).map((e) => {
    const a = boxes.get(e.attrs.from) ?? rects.get(e.attrs.from), b = boxes.get(e.attrs.to), lift = !boxes.has(e.attrs.from);
    let side = 0;
    if (lift) {
      // a lifted arrow comes back in along its node's row, so it leaves from a side with no other node of the region in that row,
      // and not one another lifted arrow of the region already uses
      const used = lifts.get(e.attrs.from) ?? new Set(), between = (s) => a.ids.find((id) => boxes.get(id) !== b && boxes.get(id).y === b.y && (s < 0 ? boxes.get(id).x < b.x : boxes.get(id).x > b.x));
      const clear = [-1, 1].filter((s) => !between(s));
      side = clear.find((s) => !used.has(s)) ?? clear[0] ?? -1;
      if (!clear.length) warnings.push(`${where(e)}: the arrow "${e.attrs.label}" lifted to ${e.attrs.to} would run under ${between(-1)}; put ${e.attrs.to} at the end of its row in region "${e.attrs.from}"`);
      else if (used.has(side)) warnings.push(`${where(e)}: two lifted arrows leave region "${e.attrs.from}" on its ${side < 0 ? "left" : "right"}; put ${e.attrs.to} at the other end of its row`);
      lifts.set(e.attrs.from, used.add(side));
    }
    // two arrows between the same boxes run side by side instead of on top of each other
    const off = pairs.has(`${e.attrs.to}>${e.attrs.from}`) ? (e.attrs.from < e.attrs.to ? -12 : 12) : 0;
    const [ax, ay, bx, by] = [a.x + W / 2, a.y + H / 2, b.x + W / 2, b.y + H / 2];
    const x1 = bx > ax ? a.x + W : a.x, y2 = by > ay ? b.y : b.y + H;
    let d, mx, my, vertical = false;
    if (lift) {
      // a step every other node of a region takes to one of them: out of the region's side and back in to that node
      const out = Math.abs(a.y + a.h / 2 - by) < 20 ? a.y + a.h - 8 : a.y + a.h / 2, edge = side < 0 ? a.x : a.x + a.w;
      d = `M${edge} ${out}H${edge + side * 32}V${by}H${side < 0 ? b.x : b.x + W}`; mx = edge + side * 32; my = (out + by) / 2; vertical = true;
    }
    else if (ay === by) { const x2 = bx > ax ? b.x : b.x + W; d = `M${x1} ${ay + off}H${x2}`; mx = (x1 + x2) / 2; my = ay + off; }
    else if (ax === bx) { const y1 = by > ay ? a.y + H : a.y; d = `M${ax + off} ${y1}V${y2}`; mx = ax + off; my = (y1 + y2) / 2; vertical = true; }
    else { d = `M${x1} ${ay + off}H${bx + off}V${y2}`; mx = (x1 + bx) / 2; my = ay + off; } // out of the side, then into the top or bottom
    const r = ref(e);
    // an arrow that appears at a step draws in; one drawn from the start (step 0) just lights
    const draw = page && e.attrs["data-s"] && !/^\s*0\b/.test(e.attrs["data-s"]) ? ' pathLength="1"' : "";
    if (page && e.attrs["data-s"]) toks.push(`<circle class="ve-tok" data-s="${esc(e.attrs["data-s"])}" r="5" style="offset-path: path('${d}')"/>`);
    if (page && e.attrs.label && !vertical && e.attrs.label.length * CH > Math.abs(bx - ax) - W - 8) warnings.push(`${where(e)}: label="${e.attrs.label}" is wider than the gap between its boxes; shorten it`);
    // of two vertical arrows side by side, the left one's label goes on its left, so the labels never cross the other arrow
    const left = lift ? side < 0 : vertical && off < 0, lx = vertical ? (left ? mx - 8 : mx + 8) : mx;
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
  const y0 = Math.min(0, ...[...rects.values()].map((r) => r.y - 4));
  const regionSvg = [...rects].map(([id, r]) => `<rect class="ve-bnd" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8"/><text class="ve-bnd-t" x="${r.x + 12}" y="${r.y + 20}">${esc(r.k.attrs.label || id)}</text>`);
  // tokens sit between the arrows and the boxes, so a token enters a box and leaves from the far side
  // on a page, 14-unit labels stay at 12 px or more on narrow screens, and a small drawing does not grow past 1.3×
  const size = page ? ` ve-flow" style="--min: ${Math.ceil((w * 12) / 14)}px; --max: ${Math.round(w * 1.3)}px` : "";
  return `<div class="frame"><svg class="ve-svg${size}" viewBox="${x0} ${y0} ${w} ${height - y0}" role="img" aria-label="${esc(n.attrs.label || "")}">${regionSvg.join("")}${edgeSvg.join("")}${toks.join("")}${nodeSvg.join("")}${callouts.join("")}</svg></div>${n.machine?.proof ?? ""}`;
}
