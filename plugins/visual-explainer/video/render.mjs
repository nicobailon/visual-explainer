#!/usr/bin/env node
import { existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
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
  --voice <dir>    Narrate with <dir>/<id>.mp3 (or .wav, .m4a, .ogg, .flac, .aiff). Without it
                   the video is silent with captions.
  --captions       Burn in captions with a voice too.
  --stills         Write one PNG per scene, fully played and captioned, to <name>.stills/, then stop.
  --fps <n>        Frames per second (default 30).`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { lines: { type: "boolean" }, voice: { type: "string" }, captions: { type: "boolean" }, stills: { type: "boolean" }, fps: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
  if (values.help || !positionals.length) return console.log(USAGE);
  if (positionals.length > 2) throw new Error(`Too many arguments: ${positionals.slice(2).join(" ")}\n\n${USAGE}`);
  const home = (p) => resolve(p.replace(/^~(?=\/)/, homedir()));
  const input = home(positionals[0]);
  if (!existsSync(input)) throw new Error(`No such file: ${input}`);
  const stem = input.replace(/\.[^./]+$/, "");
  const out = home(positionals[1] ?? `${stem}.mp4`);
  const fps = Number(values.fps ?? 30);
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) throw new Error("--fps must be a whole number from 1 to 120");

  if (values.lines) {
    const scenes = await withDeck(input, ({ scenes }) => scenes);
    for (const text of new Set(scenes.flatMap((s) => s.lines))) console.log(`${lineId(text)}\t${text}`);
    return;
  }
  if (values.stills) return await withDeck(input, (deck) => stills(deck, `${stem}.stills`));
  if (!existsSync(dirname(out))) throw new Error(`Output folder does not exist: ${dirname(out)}`);
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
    // Copied skill folders carry this script without its npm dependencies.
    throw new Error("playwright-core is not installed beside this script. Run the packaged CLI instead: npx -y -p visual-explainer visual-explainer-video <deck.html> …\nIn a repository checkout, run npm install first.");
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

// Stills show each scene's last sentence as a caption, so captions can be checked against the layout.
async function stills({ page, scenes, shot, failed }, dir) {
  // A fresh, uniquely named folder per run: no stale files, no clash with another run.
  const part = mkdtempSync(`${dir}.partial-`);
  try {
    let t = 0;
    for (const [i, s] of scenes.entries()) {
      for (let b = 0; b <= s.lines.length; b++) {
        await page.evaluate(([i, b, t, text]) => { __ve.cue(t, i, b, text, true); __ve.tick(t + 1500); }, [i, b, t, s.lines[b - 1] ?? ""]);
        t += 1500;
      }
      await page.evaluate((t) => __ve.tick(t), t += 3000);
      failed();
      writeFileSync(join(part, `scene-${String(i + 1).padStart(2, "0")}.png`), await shot("png"));
    }
    // Replace the previous stills only once every new one exists.
    rmSync(dir, { recursive: true, force: true });
    renameSync(part, dir);
  } finally {
    rmSync(part, { recursive: true, force: true });
  }
  console.log(`wrote ${scenes.length} stills to ${dir}`);
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

  // One fresh folder beside the output holds the voice track and the partial MP4. The MP4 is renamed
  // into place on success, so a failed render keeps the last good one and two renders never share files.
  const partDir = mkdtempSync(join(dirname(out), ".ve-partial-"));
  const part = join(partDir, basename(out));
  let enc = null;
  try {
    const frames = Math.ceil(t * fps);
    const audio = clips ? join(partDir, "voice.wav") : null;
    if (audio) writeTrack(audio, track, frames / fps); // as long as the video, so neither stream ends early
    enc = encoder(part, { fps, audio });
    let next = 0, shown = 0;
    for (let f = 0; f < frames; f++) {
      // Each cue runs at its own time between frames, so what it starts is timed from the cue.
      const due = [];
      while (next < cues.length && cues[next].t <= f / fps) due.push(cues[next++]);
      await page.evaluate(([due, ms, captions]) => {
        for (const c of due) __ve.cue(c.t * 1000, c.scene, c.beat, c.text, captions);
        __ve.tick(ms);
      }, [due, (f / fps) * 1000, captions]);
      failed();
      await enc.write(await shot());
      const pct = Math.floor(((f + 1) / frames) * 10) * 10;
      if (pct > shown) { shown = pct; console.log(`rendered ${pct}%`); }
    }
    await enc.done();
    renameSync(part, out);
  } catch (e) {
    enc?.kill();
    throw e;
  } finally {
    rmSync(partDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
