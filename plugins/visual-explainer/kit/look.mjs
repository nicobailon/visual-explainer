// Opens a rendered kit page in headless Chrome and looks at it the way a reader would, so the agent does not script its own browser:
// script errors, sideways scrolling, labels under 12 px, text that overlaps or runs out of its drawing, headings that sit on what
// follows, every stepper step, and a contact sheet of the first screen, the figures, and the steps. playwright-core is an optional peer.
import { createRequire } from "node:module";
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WIDTHS = [390, 1280];
const MIN_LABEL = 12;
const MIN_HEADING_GAP = 8;
// ≈1.15 megapixels, the most a model takes in before it scales an image down
const SHEET_W = 1200, SHEET_H = 960, PAD = 16, GAP = 12, LABEL = 22, MAX_SHEETS = 3;
// a font still downloading after load must not hold the render; a late font only shifts glyphs slightly
const fontsReady = () => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]);

async function launch() {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch (e) {
    if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
    // import() never looks in global installs, so it goes beside the plugin
    const plugin = dirname(dirname(fileURLToPath(import.meta.url)));
    return { skipped: `playwright-core is not installed. Run: npm install --no-save --prefix "${plugin}" playwright-core (in a repository checkout, npm install is enough)` };
  }
  try {
    return { browser: await chromium.launch() };
  } catch (e) {
    try {
      return { browser: await chromium.launch({ channel: "chrome" }) };
    } catch {
      const { version } = createRequire(import.meta.url)("playwright-core/package.json");
      return { skipped: `no browser started (${e.message.split("\n")[0]}). Install Google Chrome, or run: npx playwright-core@${version} install chromium-headless-shell` };
    }
  }
}

// Runs in the page: the smallest rendered SVG label, overflow, figure and prose counts, and whether the kit's script finished.
function measure(minLabel) {
  let smallest = null;
  for (const t of document.querySelectorAll("svg text")) {
    if (!t.textContent.trim() || !t.checkVisibility({ visibilityProperty: true })) continue;
    const m = t.getScreenCTM();
    if (!m) continue;
    const px = parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b);
    if (!smallest || px < smallest.px) smallest = { px: Math.round(px * 100) / 100, text: t.textContent.trim().slice(0, 40) };
  }
  // SVG text with no fill gets the default black, which no kit token is; it vanishes on a dark scheme. A page whose own text is black is exempt.
  const black = "rgb(0, 0, 0)";
  const unfilled = getComputedStyle(document.body).color === black ? [] : [...document.querySelectorAll("svg text")].filter((t) => t.textContent.trim() && !t.closest("defs, marker, symbol, clipPath, mask, pattern") && t.checkVisibility() && getComputedStyle(t).fill === black);
  let prose = 0;
  for (const p of document.querySelectorAll("p, li")) if (!p.closest("figure") && !p.parentElement.closest("p, li")) prose += p.textContent.trim().split(/\s+/).filter(Boolean).length;
  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    smallest,
    small: smallest !== null && smallest.px < minLabel,
    unfilled: unfilled.length ? { n: unfilled.length, text: unfilled[0].textContent.trim().slice(0, 40) } : null,
    figures: document.querySelectorAll("figure").length,
    prose,
    kit: document.documentElement.dataset.veKit === "ready",
  };
}

// Runs in the page: visible text that overlaps other text or runs past its drawing, in one stepper (r) or in every drawing.
function inspect(r) {
  const figs = [...document.querySelectorAll("main figure")];
  const scope = r === null ? document : document.querySelectorAll(".ve-steps")[r];
  const short = (s) => s.trim().replace(/\s+/g, " ").slice(0, 32);
  const name = (svg) => {
    const f = svg.closest("figure"), i = figs.indexOf(f);
    const capEl = f?.querySelector("figcaption");
    const capText = capEl ? [...capEl.childNodes].filter((n) => !n.classList?.contains("fig-n")).map((n) => n.textContent).join("") : "";
    const cap = short(capText || svg.getAttribute("aria-label") || "");
    return `${i >= 0 ? `Fig ${i + 1}` : "A drawing"}${cap ? ` ("${cap}…")` : ""}`;
  };
  const found = [];
  // A text's box is its em box; the letters sit in about its middle 56%, so two stacked labels can touch boxes without touching letters.
  const ink = (t) => { const r = t.getBoundingClientRect(), d = r.height * 0.22; return { left: r.left + 1, right: r.right - 1, top: r.top + d, bottom: r.bottom - d }; };
  const area = (r) => (r.right - r.left) * (r.bottom - r.top);
  // two texts that overlap are fine when an opaque shape painted between them covers the lower one (a job card over an idle slot)
  const covered = (ta, tb) => {
    const mid = (a, b) => [(Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2, (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2];
    scrollBy(0, mid(ink(ta), ink(tb))[1] - innerHeight / 2);
    const stack = document.elementsFromPoint(...mid(ink(ta), ink(tb)));
    const ia = stack.findIndex((e) => ta.contains(e)), ib = stack.findIndex((e) => tb.contains(e));
    if (ia < 0 || ib < 0) return true;
    return stack.slice(Math.min(ia, ib) + 1, Math.max(ia, ib)).some((e) => {
      if (!(e instanceof SVGGeometryElement) || e instanceof SVGTextContentElement) return false;
      const cs = getComputedStyle(e);
      return cs.fill !== "none" && parseFloat(cs.fillOpacity) >= 0.9 && parseFloat(cs.opacity) >= 0.9;
    });
  };
  // A label a border or line runs through or touches: a visible point of a shape's outline lies in the label's ink box, or within
  // TOUCH px of its ends. A label fully inside a shape (a node's name) or clear of it never has one there. A point is not visible
  // when an opaque shape painted later covers it (an edge under a callout's disc). A label with a --bg halo (paint-order: stroke,
  // like .ve-el) is drawn to sit on what was painted before it, and a label wholly under an opaque shape painted after it is hidden.
  // A line under 1.6:1 against the page (a --border rule, a ledger, a grid) is decoration, not a crossing.
  const crossed = (svg, texts) => {
    const TOUCH = 4;
    const seen = (e) => { let o = 1; for (let n = e; n && n !== svg.parentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
    const later = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    const lum = (c) => {
      const n = (c.match(/rgba?\(([^)]*)\)/)?.[1] ?? c.match(/color\(srgb ([^)]*)\)/)?.[1] ?? "").split(/[\s,/]+/).filter(Boolean).map(Number);
      if (n.length < 3 || n.some(Number.isNaN)) return null;
      const [r, g, b] = (/^rgb/.test(c) ? n.slice(0, 3).map((v) => v / 255) : n.slice(0, 3)).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const probeBg = document.createElement("i"); probeBg.style.color = "var(--bg, #fff)"; document.body.append(probeBg);
    const bg = lum(getComputedStyle(probeBg).color) ?? 1; probeBg.remove();
    const faint = (c) => { const l = lum(c); return l !== null && (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05) < 1.6; };
    const shapes = [];
    for (const e of svg.querySelectorAll("rect, circle, ellipse, line, polyline, polygon, path")) {
      if (e.closest("defs, marker, symbol, clipPath, mask, pattern, text") || !e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || seen(e) < 0.3) continue;
      // a filled path is an area even without a closing z (a datastore's body); a line, a polyline, or an unfilled open path is a line
      const cs = getComputedStyle(e), filled = cs.fill !== "none" && !(e instanceof SVGLineElement) && !(e instanceof SVGPolylineElement);
      const open = !filled && !(e instanceof SVGPathElement && /z\s*$/i.test(e.getAttribute("d") ?? "")) && !(e instanceof SVGRectElement || e instanceof SVGCircleElement || e instanceof SVGEllipseElement || e instanceof SVGPolygonElement);
      const stroked = cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0 && parseFloat(cs.strokeOpacity) >= 0.3 && !faint(cs.stroke);
      const opaque = filled && parseFloat(cs.fillOpacity) >= 0.9 && seen(e) >= 0.9;
      const edged = stroked || (filled && parseFloat(cs.fillOpacity) >= 0.5 && !faint(cs.fill));
      if (!edged && !opaque) continue;
      const m = e.getScreenCTM(), inv = m.inverse(), len = e.getTotalLength(), step = 1.5 / (Math.hypot(m.a, m.b) || 1), pts = [];
      if (edged) for (let s = 0; s <= len; s += step) { const p = e.getPointAtLength(s); pts.push(new DOMPoint(p.x, p.y).matrixTransform(m)); }
      shapes.push({ e, pts, opaque, open, inside: (p) => e.isPointInFill(new DOMPoint(p.x, p.y).matrixTransform(inv)) });
    }
    const covers = (o, p) => o.opaque && o.inside(p);
    const out = [];
    for (const { t, s } of texts) {
      // measured again: the overlap check above may have scrolled the page since texts were measured
      const b = ink(t);
      if (seen(t) < 0.3) continue;
      const cs = getComputedStyle(t), halo = cs.paintOrder.startsWith("stroke") && cs.stroke !== "none" && parseFloat(cs.strokeWidth) >= 3;
      const probe = [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom], [(b.left + b.right) / 2, (b.top + b.bottom) / 2]].map(([x, y]) => ({ x, y }));
      if (shapes.some((o) => later(t, o.e) && probe.every((p) => covers(o, p)))) continue;
      let worst = null;
      for (const sh of shapes) {
        if (halo && !later(t, sh.e)) continue;
        for (const p of sh.pts) {
          if (p.x < b.left - TOUCH || p.x > b.right + TOUCH || p.y < b.top + 1 || p.y > b.bottom - 1) continue;
          if (shapes.some((o) => o !== sh && later(sh.e, o.e) && covers(o, p))) continue;
          const through = p.x > b.left && p.x < b.right;
          if (!worst || (through && !worst.through)) worst = { through, open: sh.open };
          if (through) break;
        }
        if (worst?.through) break;
      }
      if (worst) out.push(`"${s}": label ${worst.through ? "crossed by" : "touches"} a ${worst.open ? "line" : "border"}`);
    }
    return out;
  };
  for (const svg of scope.querySelectorAll("svg")) {
    if (svg.parentElement.closest("svg") || !svg.closest("main")) continue;
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    const texts = [...svg.querySelectorAll("text")]
      .filter((t) => t.textContent.trim() && t.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map((t) => ({ t, s: short(t.textContent), b: ink(t) }))
      .filter(({ b }) => b.right > b.left && b.bottom > b.top);
    // a drawing with overflow: visible (the data tags) paints past its box on purpose
    if (getComputedStyle(svg).overflow !== "visible") {
      for (const { s, b } of texts) {
        if (b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1) found.push({ where: name(svg), what: `"${s}" runs past the edge of its drawing` });
      }
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].b, b = texts[j].b;
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 1 && y > 1 && x * y > 0.1 * Math.min(area(a), area(b)) && !covered(texts[i].t, texts[j].t)) found.push({ where: name(svg), what: `"${texts[i].s}" overlaps "${texts[j].s}"` });
    }
    // charts and Pele's Mermaid put labels on their shapes by design, and the agent cannot move them
    if (!svg.matches(".ve-bars, .ve-waffle, .ve-stack, .pele")) found.push(...crossed(svg, texts).map((what) => ({ where: name(svg), what })));
  }
  scrollTo(0, 0);
  return found;
}

// Runs in the page: an h2 closer than minGap to what follows it.
function headings(minGap) {
  const found = [];
  for (const h of document.querySelectorAll("main h2")) {
    const block = h.parentElement.matches(".sec-head") ? h.parentElement : h;
    const next = block.nextElementSibling;
    if (!next || !next.checkVisibility()) continue;
    const gap = next.getBoundingClientRect().top - h.getBoundingClientRect().bottom;
    if (gap < minGap) found.push(`the heading "${h.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}" sits ${Math.max(0, Math.round(gap))} px from the ${next.tagName.toLowerCase()} below it`);
  }
  return found;
}

// Runs in the page: moves stepper r to step k (0-based) with its own controls. False when it has none.
function goStep([r, k]) {
  const root = document.querySelectorAll(".ve-steps")[r];
  const n = root.querySelectorAll(".ve-cap li").length;
  const range = root.querySelector("input[type=range]");
  if (range) { range.value = k; range.dispatchEvent(new Event("input", { bubbles: true })); return true; }
  const go = [...root.querySelectorAll("[data-go]")];
  const prev = go.find((b) => +b.dataset.go < 0), next = go.find((b) => +b.dataset.go > 0);
  if (!prev || !next) return false;
  for (let i = 0; i < n; i++) prev.click();
  for (let i = 0; i < k; i++) next.click();
  return true;
}

const pngSize = (png) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

// Lays the crops out in rows on sheets of at most SHEET_W × SHEET_H: the first screens, then each figure, then each stepper's steps
// as thumbnails. A page with more than fits on MAX_SHEETS is drawn smaller before anything is left out.
function layout(items) {
  const inner = SHEET_W - 2 * PAD, tallest = SHEET_H - 2 * PAD - LABEL;
  const pack = (figScale, stepCols) => {
    const rows = [];
    for (const it of items) {
      const scaled = it.cells.map((c) => {
        const s = it.kind === "overview" ? 0.62 : it.kind === "steps" ? (inner - GAP * (stepCols - 1)) / stepCols / c.w : figScale;
        return { ...c, s: Math.min(1, s, inner / c.w, tallest / c.h) };
      });
      // each group starts a row; its cells flow left to right
      let row = [], width = -GAP;
      for (const c of scaled) {
        const w = Math.round(c.w * c.s) + GAP;
        if (row.length && width + w > inner) { rows.push(row); row = []; width = -GAP; }
        row.push(c); width += w;
      }
      if (row.length) rows.push(row);
    }
    return rows;
  };
  let rows = [];
  for (const [figScale, stepCols] of [[0.8, 3], [0.65, 4], [0.55, 5]]) {
    rows = pack(figScale, stepCols);
    if (toSheets(rows).length <= MAX_SHEETS) break;
  }
  const sheets = toSheets(rows);
  return { sheets: sheets.slice(0, MAX_SHEETS), omitted: sheets.slice(MAX_SHEETS).flat().flat().length };
}

function toSheets(rows) {
  const sheets = [];
  let cur = [], height = 2 * PAD - GAP;
  const rowH = (row) => LABEL + Math.max(...row.map((c) => Math.round(c.h * c.s)));
  for (const row of rows) {
    const h = rowH(row) + GAP;
    if (cur.length && height + h > SHEET_H) { sheets.push(cur); cur = []; height = 2 * PAD - GAP; }
    cur.push(row); height += h;
  }
  if (cur.length) sheets.push(cur);
  return sheets;
}

async function drawSheets(browser, sheets, outBase) {
  const page = await browser.newPage({ viewport: { width: SHEET_W, height: SHEET_H } });
  const paths = [];
  try {
    for (const [n, rows] of sheets.entries()) {
      // the sheet is only as wide as its widest row: blank pixels cost the model as much as drawn ones
      const html = `<!doctype html><body style="margin:0;background:#fff"><div id="s" style="width:max-content;max-width:${SHEET_W}px;box-sizing:border-box;padding:${PAD}px;display:flex;flex-direction:column;gap:${GAP}px;font:600 13px/18px system-ui,sans-serif;color:#333">${rows.map((row) => `<div style="display:flex;gap:${GAP}px;align-items:flex-start">${row.map((c) => `<div><div style="height:${LABEL - 4}px;margin-bottom:4px">${c.label}</div><img src="data:image/png;base64,${c.png.toString("base64")}" width="${Math.round(c.w * c.s)}" height="${Math.round(c.h * c.s)}" style="display:block;outline:1px solid #ccc"></div>`).join("")}</div>`).join("")}</div></body>`;
      await page.setContent(html, { waitUntil: "load" });
      const path = `${outBase}.sheet${n ? `-${n + 1}` : ""}.png`;
      writeFileSync(path, await page.locator("#s").screenshot());
      paths.push(path);
    }
  } finally {
    await page.close();
  }
  return paths;
}

/**
 * Looks at a rendered page. Returns { problems, sheets, widths, errors } or { skipped } when there is no browser.
 * With `sheet`, writes <name>.sheet.png (and -2, -3 … when one would be too small to read) beside the page, replacing older ones.
 */
export async function lookAt(file, { sheet = true } = {}) {
  const got = await launch();
  if (got.skipped) return { skipped: got.skipped, problems: [], sheets: [] };
  const { browser } = got;
  const path = resolve(file), url = pathToFileURL(path).href;
  const result = { file: path, errors: [], widths: {}, problems: [], sheets: [], omitted: 0 };
  const geometry = new Map();
  const note = (list, step) => {
    for (const { where, what } of list) {
      const key = `${where}: ${what}`;
      if (!geometry.has(key)) geometry.set(key, []);
      if (step && !geometry.get(key).includes(step)) geometry.get(key).push(step);
    }
  };
  try {
    // as a reader opens it, at each width
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        // an offline or blocked fetch from another origin (the kit's web font) is the host's situation, not the page's
        if (/^Failed to load resource: net::/.test(m.text()) && !m.location().url.startsWith("file:")) return;
        result.errors.push(`console at ${width}px: ${m.text()}`);
      });
      page.on("pageerror", (e) => result.errors.push(`page error at ${width}px: ${e.message}`));
      await page.goto(url, { waitUntil: "load", timeout: 15000 });
      await page.evaluate(fontsReady);
      await page.waitForTimeout(300);
      result.widths[width] = await page.evaluate(measure, MIN_LABEL);
      await page.close();
    }

    // the final state without motion: geometry, every step, and the crops for the sheet
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", colorScheme: "light" });
    const items = [];
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "load", timeout: 15000 });
      await page.evaluate(fontsReady);
      await page.waitForTimeout(200);
      note(await page.evaluate(inspect, null));
      const gaps = await page.evaluate(headings, MIN_HEADING_GAP);
      const desktop = sheet ? await page.screenshot() : null;
      await page.setViewportSize({ width: 390, height: 900 });
      await page.waitForTimeout(100);
      gaps.push(...await page.evaluate(headings, MIN_HEADING_GAP));
      const phone = sheet ? await page.screenshot() : null;
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(100);
      result.problems.push(...new Set(gaps));
      if (sheet) items.push({ kind: "overview", cells: [{ png: desktop, ...pngSize(desktop), label: "First screen · 1280" }, { png: phone, ...pngSize(phone), label: "390" }] });

      // figures below the first screen, steppers aside (their steps follow)
      const figs = await page.$$("main figure");
      // a drawing wider than its frame scrolls sideways on the page; its crop shows all of it, then the page is put back
      const shoot = async (el) => {
        const clip = await el.evaluate((e) => {
          const frames = [...(e.matches(".frame") ? [e] : []), ...e.querySelectorAll(".frame")].filter((f) => f.scrollWidth > f.clientWidth + 1);
          e.__veOld = frames.map((f) => [f, f.getAttribute("style")]);
          for (const f of frames) f.style.cssText += `;overflow:visible;width:${f.scrollWidth}px;max-width:none`;
          const rs = [e, ...frames].map((x) => x.getBoundingClientRect());
          const x = Math.min(...rs.map((r) => r.left)), y = Math.min(...rs.map((r) => r.top));
          return { x: x + scrollX, y: y + scrollY, width: Math.max(...rs.map((r) => r.right)) - x, height: Math.max(...rs.map((r) => r.bottom)) - y };
        });
        try {
          return await page.screenshot({ fullPage: true, clip });
        } finally {
          await el.evaluate((e) => { for (const [f, s] of e.__veOld) s === null ? f.removeAttribute("style") : f.setAttribute("style", s); delete e.__veOld; });
        }
      };
      for (const [i, fig] of figs.entries()) {
        const { top, stepped } = await fig.evaluate((f) => ({ top: f.getBoundingClientRect().bottom + scrollY, stepped: f.matches(".ve-steps") || !!f.querySelector(".ve-steps") }));
        if (!sheet || stepped || top <= 900) continue;
        const png = await shoot(fig);
        items.push({ kind: "figure", cells: [{ png, ...pngSize(png), label: `Fig ${i + 1}` }] });
      }

      // each stepper, step by step
      const steppers = await page.$$(".ve-steps");
      for (const [r, root] of steppers.entries()) {
        const n = await root.evaluate((e) => e.querySelectorAll(".ve-cap li").length);
        const fig = (await root.evaluateHandle((e) => e.closest("figure") ?? e)).asElement();
        // a step's thumbnail is its drawing; the caption is text the agent wrote
        const drawing = (await root.evaluateHandle((e) => e.querySelector(".frame") ?? e.querySelector("svg") ?? e)).asElement();
        const figN = await fig.evaluate((f) => [...document.querySelectorAll("main figure")].indexOf(f) + 1);
        const cells = [];
        for (let k = 0; k < n; k++) {
          if (!(await page.evaluate(goStep, [r, k]))) break;
          await page.waitForTimeout(60);
          note(await page.evaluate(inspect, r), `${k + 1}`);
          if (sheet) { const png = await shoot(drawing); cells.push({ png, ...pngSize(png), label: `${figN ? `Fig ${figN}` : "Stepper"} · step ${k + 1}/${n}` }); }
        }
        if (n) await page.evaluate(goStep, [r, n - 1]);
        if (cells.length) items.push({ kind: "steps", cells });
      }

      // a page that sets its own colors gets its first screen in dark too
      const custom = await page.evaluate(() => [...document.querySelectorAll("style:not([data-ve-kit])")].some((s) => /--(?:accent|bg|surface|text|border|ok|warn|risk|info)[\w-]*\s*:/.test(s.textContent)));
      if (sheet && custom) {
        const dark = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", colorScheme: "dark" });
        try {
          const d = await dark.newPage();
          await d.goto(url, { waitUntil: "load" });
          await d.evaluate(fontsReady);
          await d.waitForTimeout(200);
          const png = await d.screenshot();
          items.push({ kind: "figure", cells: [{ png, ...pngSize(png), label: "First screen · dark" }] });
        } finally {
          await dark.close();
        }
      }
    } finally {
      await context.close();
    }

    if (sheet) {
      const outBase = path.replace(/\.html?$/i, "");
      const own = new RegExp(`^${basename(outBase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.sheet(?:-\\d+)?\\.png$`);
      for (const f of readdirSync(dirname(path))) if (own.test(f)) rmSync(join(dirname(path), f));
      const { sheets, omitted } = layout(items);
      result.sheets = await drawSheets(browser, sheets, outBase);
      result.omitted = omitted;
    }
  } catch (e) {
    // the page is already written; a browser failure is a skipped check, not a failed render
    return { skipped: `the visual check could not finish: ${String(e.message).split("\n")[0]}`, problems: [], sheets: [] };
  } finally {
    await browser.close();
  }

  const at = result.widths;
  const shapes = [...geometry].map(([key, steps]) => (steps.length ? `${key} (step${steps.length > 1 ? "s" : ""} ${steps.join(", ")})` : key));
  result.problems = [
    ...result.errors,
    ...WIDTHS.filter((w) => at[w].overflow).map((w) => `the page scrolls sideways at ${w}px`),
    ...WIDTHS.filter((w) => at[w].small).map((w) => `a diagram label renders at ${at[w].smallest.px}px at ${w}px ("${at[w].smallest.text}"); keep labels at ${MIN_LABEL}px or more`),
    ...(at[1280].kit ? [] : ["the kit's script did not run to its end"]),
    ...(at[1280].unfilled ? [`${at[1280].unfilled.n} SVG label(s) have no fill, so they are black on a dark scheme ("${at[1280].unfilled.text}"); use a kit class or a token`] : []),
    ...result.problems,
    ...shapes,
  ];
  return result;
}

/** The lines every host prints after a render: problems as ✗, or the smallest label; then the sheet to look at. */
export function lookLines(r) {
  if (r.skipped) return [`Visual check skipped: ${r.skipped}`];
  const shown = r.problems.slice(0, 12);
  const lines = shown.length
    ? [...shown.map((p) => `✗ ${p}`), ...(r.problems.length > shown.length ? [`✗ … and ${r.problems.length - shown.length} more`] : [])]
    : [`✓ Visual check: no problems · smallest label ${WIDTHS.map((w) => `${r.widths[w].smallest?.px ?? "—"}px at ${w}`).join(", ")}`];
  if (r.sheets.length) lines.push(`Look at: ${r.sheets.join(", ")}${r.omitted ? ` (${r.omitted} more crops left out)` : ""}`);
  return lines;
}
