// <ve-ask> on a kit page (kit/render.mjs inlines this only when the page has one, after kit/reply.js).
// An answer the reader gives counts toward Reply (N) and goes into the reply; a question left alone is listed as no answer, even with a default.
{
const R = window.veReply, asks = R ? R.$$("main fieldset.ask[data-ask]") : [];
if (asks.length) {
  const KEY = `ve-page-ask:${location.pathname}`;
  const inputs = (a) => R.$$("input", a);
  const read = (a) => { const ins = inputs(a); return ins[0]?.type === "checkbox" ? ins.filter((i) => i.checked).map((i) => i.value) : ins.find((i) => i.checked)?.value ?? null; };
  const write = (a, v) => { for (const i of inputs(a)) i.checked = Array.isArray(v) ? v.includes(i.value) : i.value === v; };
  const defaults = new Map(asks.map((a) => [a, read(a)]));
  const clean = (s) => s.trim().replace(/\s+/g, " ");
  const label = (a, v) => clean(inputs(a).find((i) => i.value === v)?.closest("label").querySelector(".opt-label").textContent ?? v);
  const pick = (a, v = read(a)) => (Array.isArray(v) ? v.map((x) => label(a, x)).join(", ") || "none" : v == null ? "no answer" : label(a, v));
  const q = (a) => clean(R.$(".ask-q", a).textContent);
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { /* storage can be off for file:// pages */ }
  const answered = (a) => Object.hasOwn(done, a.dataset.ask);
  // a saved answer whose options are gone (the page was revised) is dropped
  for (const a of asks) if (answered(a)) { const v = done[a.dataset.ask]; if ([v].flat().every((x) => inputs(a).some((i) => i.value === x))) write(a, v); else delete done[a.dataset.ask]; }
  const save = () => { try { if (Object.keys(done).length) localStorage.setItem(KEY, JSON.stringify(done)); else localStorage.removeItem(KEY); } catch { /* see above */ } };
  const record = (a) => { done[a.dataset.ask] = read(a); save(); R.refresh(); };
  for (const a of asks) {
    a.addEventListener("change", () => record(a));
    // a click, Space, or Enter on the option already selected is an answer too, though no change fires;
    // where a change does follow, it records the final value
    a.addEventListener("click", (e) => { if (e.target.matches("input")) record(a); });
    a.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("input:checked")) record(a); });
  }
  const state = (a) => (answered(a) ? pick(a) : "no answer");
  R.parts.push({
    count: () => asks.filter(answered).length,
    lines: () => asks.map((a) => `- ${a.dataset.ask} (${q(a)}): ${state(a)}`),
    rows: () => R.h("section", { class: "r-sec" }, R.h("p", { class: "ve-label caps" }, `Questions · ${asks.filter(answered).length} of ${asks.length} answered`),
      asks.map((a) => R.h("div", { class: "r-row" }, R.h("span", { class: "k" }, answered(a) ? "✓" : "·"), R.h("span", {}, state(a), R.h("small", {}, q(a))),
        R.h("span", { class: "acts" }, R.h("button", { type: "button", onclick: () => { R.close(); a.scrollIntoView({ block: "center" }); (inputs(a).find((i) => i.checked) || inputs(a)[0]).focus({ preventScroll: true }); } }, answered(a) ? "Change" : "Answer"))))),
    clear: () => { done = {}; save(); for (const a of asks) write(a, defaults.get(a)); },
  });
}
}
