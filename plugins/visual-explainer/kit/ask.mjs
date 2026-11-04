// <ve-ask>: a question the reader answers in the page, with <ve-opt> options. Plans and kit pages share it; ctx:
//   ids        Map from an id to where it was first used, shared by the page's asks
//   k, total   this ask's number and how many the page has
//   claims     plans: the claim numbers an option's removes= may name
//   page       pages: default is optional, removes= is an error, and the legend says Question
import { esc, inner, kids, textOf, words } from "./html.mjs";

export function expandAsk(n, { errors, warnings, where, ids, k, total, claims = new Set(), page = false }) {
  const at = where(n);
  const id = n.attrs.id;
  if (!id || !/^[\w-]+$/.test(id)) errors.push(`${at}: needs id="word" (letters, digits, - or _)`);
  else if (id in Object.prototype) errors.push(`${at}: id="${id}" is a reserved name; pick another`);
  else if (ids.has(id)) errors.push(`${at}: id="${id}" is already used at ${ids.get(id)}`);
  ids.set(id, at);
  for (const name of Object.keys(n.attrs)) {
    if (name === "default") errors.push(`${at}: default goes on the option itself: <ve-opt value="…" default>`);
    else if (!["id", "q", "multi", "data-if"].includes(name)) errors.push(`${at}: unknown attribute ${name}=; <ve-ask> takes id, q and multi`);
  }
  const q = n.attrs.q || "";
  if (!q) errors.push(`${at}: needs q="the question"`);
  else if (words(q) > 15) warnings.push(`${at}: the question is ${words(q)} words; keep it to about 15`);
  const multi = "multi" in n.attrs;
  const opts = kids(n).filter((k) => k.name === "ve-opt");
  if (opts.length < 2) errors.push(`${at}: needs at least two <ve-opt>`);
  const defaults = opts.filter((o) => "default" in o.attrs);
  if (!multi && !page && defaults.length !== 1) errors.push(`${at}: mark exactly one <ve-opt default>, the option you would build`);
  if (!multi && page && defaults.length > 1) errors.push(`${at}: mark at most one <ve-opt default>`);
  const values = new Set();
  for (const o of opts) {
    if (!o.attrs.value) errors.push(`${where(o)}: needs value=""`);
    else if (values.has(o.attrs.value)) errors.push(`${where(o)}: value="${o.attrs.value}" is used twice`);
    values.add(o.attrs.value);
    if (page && o.attrs.removes) errors.push(`${where(o)}: removes= belongs to plan pages`);
    else for (const no of (o.attrs.removes || "").split(/\s+/).filter(Boolean)) if (!claims.has(no)) errors.push(`${where(o)}: removes="${no}", but there is no claim ${no}`);
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
  const legend = page ? (total > 1 ? `Question <b>${k}</b> of ${total}` : "Question") : `Decision <b>${k}</b> of ${total}`;
  return `<fieldset class="ask${row ? " row" : ""}" id="ask-${esc(id)}" data-ask="${esc(id)}"><legend class="ask-n">${legend}</legend><p class="ask-q">${esc(q)}</p><div class="ask-opts">${body}</div></fieldset>`;
}
