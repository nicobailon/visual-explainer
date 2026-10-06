import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";

const RATE = 48000;
const WPS = 2.5; // caption reading speed in words per second
const AUDIO = /\.(mp3|wav|m4a|aac|ogg|opus|flac|aiff?)$/i;

// A narration line's clip is <id>.<ext> in the voice folder. The id hashes the text, so an edited
// line needs a new clip and an unchanged line keeps its old one.
export const lineId = (text) => createHash("sha256").update(text).digest("hex").slice(0, 12);

// Line text -> mono 16-bit PCM. Every line must have a clip.
export function loadVoice(dir, lines) {
  // Only finished audio files count, so a leftover download such as <id>.tmp never stands in for a clip.
  const files = new Map(readdirSync(dir).filter((f) => AUDIO.test(f)).map((f) => [parse(f).name, join(dir, f)]));
  const missing = [...new Set(lines)].filter((t) => !files.has(lineId(t)));
  if (missing.length) {
    throw new Error(`${missing.length} line(s) have no clip in ${dir}. Make <id>.mp3 (or .wav) for each:\n${missing.map((t) => `  ${lineId(t)}\t${t}`).join("\n")}`);
  }
  const decode = (file) => {
    try { return execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", String(RATE), "pipe:1"], { maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { throw new Error(`Not a readable audio clip: ${file}\n${e.stderr?.toString().trim()}`); }
  };
  return new Map([...new Set(lines)].map((t) => [t, decode(files.get(lineId(t)))]));
}

// Seconds a line lasts: its clip, or the time a viewer needs to read it as a caption.
export const lineLength = (text, pcm) => (pcm ? pcm.length / 2 / RATE : Math.max(1.5, text.split(/\s+/).length / WPS));

// Lay each clip at its start time on one silent track and write a WAV file.
export function writeTrack(file, clips, total) {
  const data = Buffer.alloc(Math.ceil(total * RATE) * 2);
  for (const { at, pcm } of clips) pcm.copy(data, Math.round(at * RATE) * 2);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0); head.writeUInt32LE(36 + data.length, 4); head.write("WAVE", 8);
  head.write("fmt ", 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write("data", 36); head.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([head, data]));
}

// ffmpeg reading JPEG frames on stdin at a constant rate.
export function encoder(out, { fps, audio }) {
  const args = ["-y", "-v", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(fps), "-i", "pipe:0"];
  if (audio) args.push("-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k");
  args.push("-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out);
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  let failure = null;
  const exited = new Promise((resolve, reject) => {
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
  });
  exited.catch((e) => { failure = e; });
  ff.stdin.on("error", () => {}); // EPIPE once ffmpeg has exited; its exit code carries the failure
  return {
    async write(buf) {
      if (failure) throw failure;
      // A drain never comes from an ffmpeg that has exited, so wait on either.
      if (!ff.stdin.write(buf)) await Promise.race([new Promise((r) => ff.stdin.once("drain", r)), exited]);
    },
    async done() { ff.stdin.end(); await exited; },
    kill() { ff.kill("SIGKILL"); },
  };
}

export function requireFfmpeg() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); }
  catch { throw new Error("ffmpeg is not on PATH. Install it first, for example: brew install ffmpeg"); }
}

export const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
