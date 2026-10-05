# Video

Make an MP4 only when asked. The source is a video deck: one HTML file whose scenes carry their narration. `visual-explainer-video` plays it on a virtual clock and saves every frame, so motion never stutters and each sentence's picture lands with its voice.

```
script ──► deck.html ──► --stills ──► look, fix ──► (voice clips) ──► deck.mp4
```

## Script first

- One claim per scene, 1–3 sentences each. Most videos run 45–120 s over 6–12 scenes.
- The first scene is a hook: the problem or the surprising number. The last is the one line to remember.
- The picture changes on every sentence. Sentence N starting is beat N.
- Write for the ear. Spell out numbers and symbols ("fifty-six hundred", "about one millisecond"). No abbreviations with periods: the deck splits sentences at `.`, `!`, and `?`.

## The contract

The renderer opens the deck at 1280×720 CSS pixels and records 1920×1080. It only sets attributes and fires events. The deck's own CSS and JS decide everything visible.

```html
<style>
  body { position: relative; width: 1280px; height: 720px; overflow: hidden; margin: 0; }
  section[data-say] { position: absolute; inset: 0; display: none; }
  section[data-beat], section[data-was] { display: grid; }          /* on now, or leaving */
  section[data-was] { z-index: 2; animation: leave .5s forwards; }   /* exit */
  @keyframes leave { to { opacity: 0; } }
  .miss { opacity: 0; transition: opacity .6s; }
  [data-beat~="2"] .miss { opacity: 1; }                             /* sentence 2 has started */
</style>
<section data-say="Every read checks Redis first. A miss goes on to Postgres." data-hold="1">
  <h2>Ask Redis first.</h2> <svg>…</svg> <p class="miss">…</p>
</section>
<script>
  addEventListener('ve:beat', (e) => { /* e.target is the scene; e.detail is { scene, beat } */ });
  addEventListener('ve:leave', (e) => { /* stop that scene's loops */ });
</script>
```

| The renderer sets | When |
|---|---|
| `data-beat="0"` on the scene | the scene starts; becomes `"0 1"`, `"0 1 2"`… as each sentence starts |
| `data-was` on the previous scene | the next scene starts; removed at the change after that |
| `ve:beat` and `ve:leave` events (they bubble) | with each change above |
| text of `p.ve-caption` | each sentence, when captions are on; style `.ve-caption` to restyle |

Timing: 0.5 s before the first sentence, 0.3 s between sentences, 0.9 s after the last, plus `data-hold` seconds. A silent sentence lasts as long as a viewer needs to read its caption (2.5 words per second, at least 1.5 s). A scene with an empty `data-say` lasts 3 s.

CSS animations and transitions, the Web Animations API, timers, `requestAnimationFrame`, canvas, SVG, and three.js all run on the renderer's clock. `<video>`, `<audio>`, and content loaded after the page starts do not. Load fonts with a `<link>` in `<head>`.

## Look

- The style guide still applies: a register, its fonts, one accent, hand-drawn SVG from `diagrams.md`. Pick one color scheme and set the tokens directly. A video is one artifact, and the renderer does not choose a scheme.
- **Video exception:** slow ambient motion is allowed and helps, so no frame is ever still: light that drifts over 30 s or more, a slowly panning grid, faint film grain. Still no neon, gradient text, or glassmorphism.
- Size for a phone held sideways: body text 24 px or larger, labels 15 px or larger, headings 48–88 px, diagram node text 22, edge labels 17, strokes 2 (hot path 3.5).
- Keep text 64 px from the sides and 48 px from the top. Keep the bottom 112 px clear for captions.
- Motion: the scene's base layer enters at its start; each beat adds or changes one thing; paths draw in (`pathLength="1"` plus `stroke-dashoffset`); numbers count up; flow dots move at the real rate. Each change settles within about 1.5 s.
- Under 8 visible boxes per diagram, one focal point per beat.

## Check, then render

1. `visual-explainer-video deck.html --stills` writes one PNG per scene, fully played and with its last sentence as a caption, to `deck.stills/`. Read every one. Fix clipped, overlapping, crowded, or empty scenes, then run it again.
2. Voice: if a speech API key is set, make one clip per line (below). If none is set, skip voice: the video is silent with captions burned in. Never print a key.
3. `visual-explainer-video deck.html [out.mp4] [--voice clips/]`. Add `--captions` to burn in captions with a voice too.
4. Report the MP4 path, its length, and the voice used, or "silent with captions".

Write the deck to `~/.agent/diagrams/<name>.html`; the MP4 goes beside it. The renderer needs `ffmpeg` and either Google Chrome or `npx playwright-core install chromium-headless-shell`. If `visual-explainer-video` is not on PATH (a copied skill folder has no npm dependencies), run `npx -y -p visual-explainer visual-explainer-video` with the same arguments. From a repository checkout, run `npm install` and use `node plugins/visual-explainer/video/render.mjs`.

## Voice clips

`--lines` prints `<id><TAB><text>` for every sentence. Save each clip as `<clips>/<id>.mp3` (`.wav`, `.m4a`, `.ogg`, `.flac`, and `.aiff` also work; other files are ignored). The id hashes the text, so after an edit only changed lines need new clips.

| Provider | Key | Request | Reply |
|---|---|---|---|
| ElevenLabs | `ELEVENLABS_API_KEY` | `POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id>`, header `xi-api-key`, `{"text", "model_id": "eleven_multilingual_v2"}` | MP3 |
| Seed Audio (fal) | `FAL_KEY` | `POST https://fal.run/bytedance/seed-audio-1.0`, header `Authorization: Key …`, `{"prompt": text, "voice": "stokie_en"}` | JSON; download `.audio.url` |
| OpenAI | `OPENAI_API_KEY` | `POST https://api.openai.com/v1/audio/speech`, bearer, `{"model": "gpt-4o-mini-tts", "voice": "coral", "input": text}` | MP3 |
| xAI | `XAI_API_KEY` | `POST https://api.x.ai/v1/tts`, bearer, `{"text", "voice_id": "eve", "language": "en"}` | MP3 |

Use the user's chosen provider and voice; otherwise the first key that is set. Write to a temporary file and move it into place only on success, so an error body never becomes a clip:

```bash
mkdir -p clips
visual-explainer-video deck.html --lines | while IFS=$'\t' read -r id text; do
  [ -f "clips/$id.mp3" ] && continue
  curl -sS --fail https://api.openai.com/v1/audio/speech -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" -o "clips/$id.tmp" \
    -d "$(jq -n --arg t "$text" '{model: "gpt-4o-mini-tts", voice: "coral", input: $t}')" \
    && mv "clips/$id.tmp" "clips/$id.mp3"
done
```

## Tutorial of a live web app

For "record a walkthrough of X", record the real app instead of drawing it. The app runs in real time, so a recording script fits better than the renderer.

1. Do the task once in a browser. Note the start URL and a role or text locator for each control. A logged-in app needs a Playwright storage state; the user makes it with `npx playwright-core codegen --save-storage=auth.json <url>`. Never ask for credentials.
2. Write the steps: one action and one sentence each, a title step first, and a closing step with the one thing to remember.
3. Write one Playwright script that records with `recordVideo: { dir, size: { width: 1280, height: 720 } }` at the same viewport. Draw a cursor with `addInitScript`: a fixed arrow that follows `mousemove`, plus a ring on `mousedown`. Before each click, move with `page.mouse.move(x, y, { steps: 25 })`. After each action, wait until the step's clip has finished, plus about 0.8 s. Record each step's start time.
4. With ffmpeg, place each clip at its step's start (`adelay`, then `amix`) and mux it with the recording, trimming the blank lead-in. With no voice key, show the sentence as an on-page caption from the init script instead.
