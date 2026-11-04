export type Stereo = { playback: "stopped" | "playing" | "paused"; volume: "muted" | "normal" | "loud" };

const louder = { muted: "normal", normal: "loud", loud: "loud" } as const;
const quieter = { muted: "muted", normal: "muted", loud: "normal" } as const;

export function step(s: Stereo, event: "play" | "pause" | "louder" | "quieter" | "power off"): Stereo {
  switch (event) {
    case "play": return s.playback === "playing" ? s : { ...s, playback: "playing" };
    case "pause": return s.playback === "playing" ? { ...s, playback: "paused" } : s;
    case "louder": return { ...s, volume: louder[s.volume] };
    case "quieter": return { ...s, volume: quieter[s.volume] };
    case "power off": return { playback: "stopped", volume: "muted" };
  }
}
