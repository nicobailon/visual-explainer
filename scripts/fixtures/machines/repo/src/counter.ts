// counts up to 6; reset goes back to 0
export const add = (n: number): number => (n < 6 ? n + 1 : n);
export const reset = (_n: number): number => 0;
