export type Car = { floor: number; door: "open" | "closed" };

// the car moves only with its door closed, but nothing stops the door opening on the roof (floor 10)
export function move(c: Car, e: "up" | "down" | "open" | "close"): Car {
  switch (e) {
    case "up": return c.door === "closed" && c.floor < 10 ? { ...c, floor: c.floor + 1 } : c;
    case "down": return c.door === "closed" && c.floor > 1 ? { ...c, floor: c.floor - 1 } : c;
    case "open": return { ...c, door: "open" };
    case "close": return { ...c, door: "closed" };
  }
}
