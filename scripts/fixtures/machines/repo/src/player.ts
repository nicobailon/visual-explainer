export type Player = { playback: "Stopped" | "Playing"; volume: "Normal" | "Loud" };
export type Action = { type: "INIT" | "PLAY" | "VOL_UP" | "VOL_DOWN" | "ENDED" };

export function reduce(s: Player | undefined, a: Action): Player {
  const cur: Player = s ?? { playback: "Stopped", volume: "Normal" };
  switch (a.type) {
    case "PLAY": return cur.playback === "Stopped" ? { ...cur, playback: "Playing" } : cur;
    case "VOL_UP": return { ...cur, volume: "Loud" };
    case "VOL_DOWN": return { ...cur, volume: "Normal" };
    case "ENDED": return cur.playback === "Playing" ? { ...cur, playback: "Stopped" } : cur;
    default: return cur;
  }
}
