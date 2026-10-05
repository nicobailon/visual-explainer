#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { duration, encoder, lineId, lineLength, loadVoice, requireFfmpeg, writeTrack } from "./media.mjs";

const DRIVER = fileURLToPath(new URL("./driver.js", import.meta.url));
const FRAME = { x: 0, y: 0, width: 1280, height: 720, scale: 1.5 }; // 1920×1080 output
const LEAD = 0.5, GAP = 0.3, TAIL = 0.9, BARE = 3; // pacing in seconds around and between lines
const USAGE = `Usage: visual-explainer-video <deck.html> [out.mp4] [options]

Renders a video deck (<section data-say> scenes) to a 1920×1080 MP4 on a virtual clock, so
every frame lands on time. See references/video.md.

Options:
  --lines          Print "<id><TAB><text>" for each narration line, then stop.
  --voice <dir>    Narrate with <dir>/<id>.mp3 (or any audio ffmpeg reads). Without it the
                   video is silent with captions.
  --captions       Burn in captions with a voice too.
  --stills         Write one PNG per scene, fully played, to <name>.stills/, then stop.
  --fps <n>        Frames per second (default 30).`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { lines: { type: "boolean" }, voice: { type: "string" }, captions: { type: "boolean" }, stills: { type: "boolean" }, fps: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
  if (values.help || !positionals.length) return console.log(USAGE);
  const home = (p) => resolve(p.replace(/^~(?=\/)/, homedir()));
  const input = home(positionals[0]);
  if (!existsSync(input)) throw new Error(`No such file: ${input}`);
  const stem = input.replace(/\.[^./]+$/, "");
  const out = home(positionals[1] ?? `${stem}.mp4`);
  const fps = Number(values.fps ?? 30);
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new Error("--fps must be a whole number from 1 to 120");

  if (values.lines) {
    const scenes = await withDeck(input, async ({ scenes }) => scenes);
    for (const text of new Set(scenes.flatMap((s) => s.lines))) console.log(`${lineId(text)}\t${text}`);
    return;
  }
  if (values.stills) return await withDeck(input, (deck) => stills(deck, `${stem}.stills`));
  requireFfmpeg();
  const voice = values.voice ? home(values.voice) : null;
  await withDeck(input, (deck) => render(deck, { out, fps, voice, captions: values.captions || !voice }));
  console.log(`wrote ${out} (${duration(out).toFixed(1)} s)`);
}

// Opens the deck at 1280×720 CSS pixels with driver.js injected, and passes it to fn.
async function withDeck(input, fn) {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch (e) {
    if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
    throw new Error(`playwright-core is not installed. Run npm install in ${resolve(fileURLToPath(import.meta.url), "../../../..")}, or install the visual-explainer npm package.`);
  }
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    if (!/Executable doesn't exist/.test(e.message)) throw e;
    try {
      browser = await chromium.launch({ channel: "chrome" });
    } catch {
      const { version } = createRequire(import.meta.url)("playwright-core/package.json");
      throw new Error(`No browser found. Install Google Chrome, or run: npx playwright-core@${version} install chromium-headless-shell`);
    }
  }
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, reducedMotion: "no-preference" });
    await ctx.addInitScript({ path: DRIVER });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(pathToFileURL(input).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const failed = () => { if (errors.length) throw new Error(`The deck threw: ${errors[0]}`); };
    failed();
    const scenes = await page.evaluate(() => __ve.scenes());
    if (!scenes.length) throw new Error(`${basename(input)} has no <section data-say> scenes.`);
    const cdp = await ctx.newCDPSession(page);
    // The clip scale re-rasterizes at 1.5×; without it a CDP screenshot comes back at 1280×720.
    const shot = async (format = "jpeg") =>
      Buffer.from((await cdp.send("Page.captureScreenshot", { format, clip: FRAME, ...(format === "jpeg" && { quality: 92, optimizeForSpeed: true }) })).data, "base64");
    return await fn({ page, scenes, shot, failed });
  } finally {
    await browser.close();
  }
}

async function stills({ page, scenes, shot, failed }, dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let t = 0;
  for (const [i, s] of scenes.entries()) {
    for (let b = 0; b <= s.lines.length; b++) {
      await page.evaluate(([i, b, t]) => { __ve.cue(i, b, ""); __ve.tick(t); }, [i, b, t += 1500]);
    }
    await page.evaluate((t) => __ve.tick(t), t += 3000);
    failed();
    const file = join(dir, `scene-${String(i + 1).padStart(2, "0")}.png`);
    writeFileSync(file, await shot("png"));
    console.log(file);
  }
}

async function render({ page, scenes, shot, failed }, { out, fps, voice, captions }) {
  const clips = voice ? loadVoice(voice, scenes.flatMap((s) => s.lines)) : null;
  // Scene start, then each line in turn; a line's beat starts when its clip starts.
  const cues = [], track = [];
  let t = 0;
  for (const [i, s] of scenes.entries()) {
    cues.push({ t, scene: i, beat: 0, text: "" });
    let at = t + LEAD;
    for (const [j, text] of s.lines.entries()) {
      cues.push({ t: at, scene: i, beat: j + 1, text });
      if (clips) track.push({ at, pcm: clips.get(text) });
      at += lineLength(text, clips?.get(text)) + GAP;
    }
    t = (s.lines.length ? at - GAP + TAIL : t + BARE) + s.hold;
  }

  const tmp = mkdtempSync(join(tmpdir(), "ve-video-"));
  let enc = null;
  try {
    const audio = clips ? join(tmp, "voice.wav") : null;
    if (audio) writeTrack(audio, track, t);
    enc = encoder(out, { fps, audio });
    const frames = Math.ceil(t * fps);
    let next = 0, shown = 0;
    for (let f = 0; f < frames; f++) {
      let c = null;
      while (next < cues.length && cues[next].t <= f / fps) c = cues[next++];
      await page.evaluate(([c, ms, captions]) => { if (c) __ve.cue(c.scene, c.beat, c.text, captions); __ve.tick(ms); }, [c, (f / fps) * 1000, captions]);
      failed();
      await enc.write(await shot());
      const pct = Math.floor(((f + 1) / frames) * 10) * 10;
      if (pct > shown) { shown = pct; console.log(`rendered ${pct}%`); }
    }
    await enc.done();
  } catch (e) {
    enc?.kill();
    rmSync(out, { force: true });
    throw e;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
