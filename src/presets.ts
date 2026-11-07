import { isHex } from "./color";
import { shapeNames } from "./shapes";
import type { Preset, PresetDefinition, Range } from "./types";

const builtin: Record<string, Preset> = {
  leaves: {
    label: "Leaves",
    shapes: ["leaf"],
    colors: ["#5f9e3a", "#79b84a", "#4a8a2f", "#8cc152", "#3e7d32"],
    size: [20, 44],
    speed: [38, 85],
    sway: [14, 40],
    swayFreq: [0.6, 1.3],
    spin: [-1.2, 1.2],
    tumble: 0.85,
    tumbleSpeed: [0.8, 2],
    opacity: [0.65, 1],
    wind: 14,
    density: 4,
  },
  autumn: {
    label: "Autumn",
    shapes: ["maple", "oak", "ginkgo", "leaf"],
    colors: ["#d9480f", "#e8590c", "#f08c00", "#c92a2a", "#a8431b", "#e67700", "#b5651d", "#f2b134"],
    size: [22, 48],
    speed: [40, 90],
    sway: [16, 44],
    swayFreq: [0.6, 1.3],
    spin: [-1.4, 1.4],
    tumble: 0.85,
    tumbleSpeed: [0.8, 2.2],
    opacity: [0.7, 1],
    wind: 20,
    density: 4,
  },
  maple: {
    label: "Maple",
    shapes: ["maple"],
    colors: ["#c92a2a", "#d9480f", "#e03131", "#f76707", "#b02525"],
    size: [22, 50],
    speed: [42, 92],
    sway: [16, 44],
    swayFreq: [0.6, 1.3],
    spin: [-1.4, 1.4],
    tumble: 0.8,
    tumbleSpeed: [0.8, 2],
    opacity: [0.75, 1],
    wind: 18,
    density: 3.6,
  },
  ginkgo: {
    label: "Ginkgo",
    shapes: ["ginkgo"],
    colors: ["#f6c915", "#f2b705", "#e9a800", "#ffd43b", "#f0b400"],
    size: [20, 44],
    speed: [36, 80],
    sway: [14, 38],
    swayFreq: [0.6, 1.2],
    spin: [-1.1, 1.1],
    tumble: 0.8,
    tumbleSpeed: [0.8, 1.9],
    opacity: [0.75, 1],
    wind: 14,
    density: 4,
  },
  sakura: {
    label: "Cherry blossom",
    shapes: ["petal"],
    colors: ["#ffc2d4", "#ffb3c8", "#ffd6e0", "#ff9fb8", "#fde2ea"],
    size: [12, 28],
    speed: [30, 65],
    sway: [20, 50],
    swayFreq: [0.7, 1.5],
    spin: [-1.6, 1.6],
    tumble: 0.9,
    tumbleSpeed: [1, 2.6],
    opacity: [0.6, 1],
    wind: 22,
    density: 6.5,
  },
  petals: {
    label: "Rose petals",
    shapes: ["roundPetal"],
    colors: ["#c2185b", "#d81b60", "#ad1457", "#e84a7f", "#9c1450"],
    size: [14, 32],
    speed: [32, 70],
    sway: [18, 46],
    swayFreq: [0.6, 1.3],
    spin: [-1.4, 1.4],
    tumble: 0.9,
    tumbleSpeed: [0.9, 2.3],
    opacity: [0.7, 1],
    wind: 16,
    density: 5,
  },
  snow: {
    label: "Snow",
    shapes: ["snowflake", "snowball", "snowball"],
    colors: ["#ffffff", "#e8f1ff", "#d6e6ff"],
    size: [6, 20],
    speed: [25, 70],
    sway: [6, 22],
    swayFreq: [0.5, 1.2],
    spin: [-0.5, 0.5],
    tumble: 0,
    tumbleSpeed: [0.4, 1],
    opacity: [0.5, 0.95],
    wind: 8,
    density: 9,
  },
  embers: {
    label: "Embers",
    shapes: ["glow"],
    colors: ["#ff7a18", "#ffb347", "#ff5e00", "#ffd166"],
    size: [4, 12],
    speed: [30, 90],
    sway: [8, 28],
    swayFreq: [0.8, 2],
    spin: [0, 0],
    tumble: 0,
    tumbleSpeed: [0.4, 1],
    opacity: [0.45, 1],
    wind: 10,
    density: 6,
    direction: -1,
  },
};

const aliases: Record<string, string> = {
  leaf: "leaves",
  green: "leaves",
  "cherry-blossom": "sakura",
  cherry: "sakura",
  blossom: "sakura",
  snowflakes: "snow",
  rose: "petals",
  "rose-petals": "petals",
  fall: "autumn",
};

const registry = new Map<string, Preset>(Object.entries(builtin));

const normalizeName = (name: string): string => name.trim().toLowerCase();

function assertRange(name: string, value: Range): void {
  if (!Array.isArray(value) || value.length !== 2 || !value.every((n) => Number.isFinite(n))) {
    throw new Error(`lwkfall: "${name}" must be a [min, max] pair of numbers`);
  }
}

/** Throws a readable error when a preset cannot be rendered. */
export function validatePreset(p: Preset): Preset {
  if (!p.shapes.length) throw new Error("lwkfall: preset needs at least one shape");
  for (const s of p.shapes) {
    if (typeof s === "string" && !shapeNames.includes(s as never)) {
      throw new Error(`lwkfall: unknown shape "${s}". Built-in shapes: ${shapeNames.join(", ")}`);
    }
    if (typeof s !== "string" && typeof s !== "function") {
      throw new Error("lwkfall: shapes must be built-in names or draw functions");
    }
  }
  if (!p.colors.length) throw new Error("lwkfall: preset needs at least one color");
  for (const c of p.colors) {
    if (!isHex(c)) throw new Error(`lwkfall: color "${c}" must be a hex value like #ff8800`);
  }
  for (const key of ["size", "speed", "sway", "swayFreq", "spin", "tumbleSpeed", "opacity"] as const) {
    assertRange(key, p[key]);
  }
  if (!(p.density > 0)) throw new Error("lwkfall: density must be greater than 0");
  if (p.tumble < 0 || p.tumble > 1) throw new Error("lwkfall: tumble must be between 0 and 1");
  if (p.direction !== undefined && p.direction !== 1 && p.direction !== -1) {
    throw new Error("lwkfall: direction must be 1 or -1");
  }
  return p;
}

function lookup(name: string): Preset | undefined {
  const key = normalizeName(name);
  return registry.get(key) ?? registry.get(aliases[key] ?? "");
}

function merge(def: PresetDefinition): Preset {
  const baseName = def.extends ?? "leaves";
  const base = lookup(baseName);
  if (!base) throw new Error(`lwkfall: cannot extend unknown preset "${baseName}"`);
  const { extends: _ignored, ...rest } = def;
  return validatePreset({ ...base, ...stripUndefined(rest) });
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** Add your own named preset. Missing fields are inherited from `extends` (default "leaves"). */
export function registerPreset(name: string, definition: PresetDefinition): Preset {
  const key = normalizeName(name);
  if (!key) throw new Error("lwkfall: preset name cannot be empty");
  const preset = merge(definition);
  registry.set(key, preset);
  return preset;
}

/** Names of every registered preset, built-in ones first. */
export function listPresets(): string[] {
  return Array.from(registry.keys());
}

/** Look up a registered preset by name or alias. */
export function getPreset(name: string): Preset | undefined {
  return lookup(name);
}

/** Turn a name or an inline definition into a validated preset. */
export function resolvePreset(input: string | Preset | PresetDefinition): { name: string; preset: Preset } {
  if (typeof input === "string") {
    const preset = lookup(input);
    if (!preset) {
      throw new Error(`lwkfall: unknown preset "${input}". Available: ${listPresets().join(", ")}`);
    }
    const key = normalizeName(input);
    return { name: registry.has(key) ? key : (aliases[key] as string), preset };
  }
  return { name: "custom", preset: merge(input as PresetDefinition) };
}
