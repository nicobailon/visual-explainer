// counts up to 2 by changing the state it is given and returning it, as a careless reducer does
export function bump(s: { n: number }): { n: number } {
  if (s.n < 2) s.n++;
  return s;
}
