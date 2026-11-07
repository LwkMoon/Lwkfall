import type { Range } from "./types";

export type Rng = () => number;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Small seedable generator so layouts can be repeated. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed?: number): Rng {
  return seed === undefined ? Math.random : mulberry32(seed);
}

export function between(rng: Rng, [a, b]: Range): number {
  return lerp(a, b, rng());
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}
