export type Door = "closed" | "open" | "locked" | "broken";
export type Act = "open" | "close" | "lock" | "unlock" | "kick" | "ring";

// broken is a dead end: no act leaves it; ring changes nothing anywhere
export function door(d: Door, a: Act): Door {
  if (d === "closed" && a === "open") return "open";
  if (d === "open" && a === "close") return "closed";
  if (d === "closed" && a === "lock") return "locked";
  if (d === "locked" && a === "unlock") return "closed";
  if (d === "locked" && a === "kick") return "broken";
  return d;
}
