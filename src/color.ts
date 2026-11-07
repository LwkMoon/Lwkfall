export type RGB = [number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(input: string): boolean {
  return HEX.test(input.trim());
}

export function parseHex(input: string): RGB | null {
  const m = HEX.exec(input.trim());
  if (!m) return null;
  let h = m[1] as string;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const to255 = (v: number): number => Math.round(Math.min(255, Math.max(0, v)));

/** amount > 0 mixes toward white, amount < 0 mixes toward black. Range -1 to 1. */
export function shade(input: string, amount: number): string {
  const rgb = parseHex(input);
  if (!rgb) return input;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const [r, g, b] = rgb.map((c) => to255(c + (target - c) * t)) as RGB;
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgba(input: string, alpha: number): string {
  const rgb = parseHex(input);
  if (!rgb) return input;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
