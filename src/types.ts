/** Draws one particle sprite centered on the origin. `r` is the half-size in px. */
export type ShapeFn = (ctx: CanvasRenderingContext2D, r: number, color: string) => void;

export type ShapeName =
  | "leaf"
  | "maple"
  | "oak"
  | "ginkgo"
  | "petal"
  | "roundPetal"
  | "snowflake"
  | "snowball"
  | "glow";

export type Range = [number, number];

export interface Preset {
  /** Human friendly name, handy for building a picker UI. */
  label: string;
  /** Built-in shape names or your own draw functions. */
  shapes: Array<ShapeName | ShapeFn>;
  /** Hex colors (#rgb or #rrggbb). Every shape is rendered in every color. */
  colors: string[];
  /** Particle size in CSS px, [far, near]. */
  size: Range;
  /** Fall speed in px per second, [slow, fast]. */
  speed: Range;
  /** Sideways drift amplitude in px per second. */
  sway: Range;
  /** Sideways drift frequency in radians per second. */
  swayFreq: Range;
  /** Flat spin in radians per second. */
  spin: Range;
  /** 0 to 1. How strongly each particle flips and shows its edge. */
  tumble: number;
  /** Flip speed in radians per second. */
  tumbleSpeed: Range;
  /** Opacity range, [far, near]. */
  opacity: Range;
  /** Default wind in px per second. Negative blows left. */
  wind: number;
  /** Particles per 100,000 px² of screen area. */
  density: number;
  /** 1 falls down, -1 rises up. Defaults to 1. */
  direction?: 1 | -1;
}

/** A preset you register: anything missing is inherited from `extends` (default "leaves"). */
export type PresetDefinition = Partial<Preset> & { extends?: string };

export interface LwkfallOptions {
  /** Element (or CSS selector) to render inside. Omit for a fullscreen overlay. */
  container?: HTMLElement | string;
  /** Exact particle count. Overrides density. */
  count?: number;
  /** Multiplier on the preset's density. Default 1. */
  density?: number;
  /** Upper limit for the automatic particle count. Default 400. */
  maxParticles?: number;
  /** Multiplier on fall speed. Default 1. */
  speed?: number;
  /** Multiplier on particle size. Default 1. */
  size?: number;
  /** Wind in px per second. Overrides the preset's wind. */
  wind?: number;
  /** Multiplier on opacity. Default 1. */
  opacity?: number;
  /** z-index of the canvas. Default 9999. */
  zIndex?: number;
  /** Particles drift away from the pointer. Default false. */
  interactive?: boolean;
  /** Pointer influence radius in px. Default 120. */
  pointerRadius?: number;
  /** Stay still when the OS asks for reduced motion. Default true. */
  respectReducedMotion?: boolean;
  /** Start animating immediately. Default true. */
  autoStart?: boolean;
  /** Seed for a repeatable layout. Handy for tests and screenshots. */
  seed?: number;
}

export interface Lwkfall {
  /** Start or resume the animation. */
  start(): void;
  /** Pause the animation. Particles stay where they are. */
  stop(): void;
  /** Start if paused, pause if running. Returns the new running state. */
  toggle(): boolean;
  /** Switch effect. Current particles finish falling while new ones drift in. */
  setPreset(preset: string | Preset | PresetDefinition): void;
  /** Change options on the fly. */
  setOptions(options: Partial<LwkfallOptions>): void;
  /** Stop and remove the canvas and every listener. */
  destroy(): void;
  /** True when the animation has been started and not stopped. */
  readonly running: boolean;
  /** Name of the active preset ("custom" for inline presets). */
  readonly preset: string;
  /** True when the effect is held back by the OS reduced motion setting. */
  readonly reducedMotion: boolean;
  /** Number of particles currently alive. */
  readonly particleCount: number;
  /** The canvas element, or null on the server. */
  readonly canvas: HTMLCanvasElement | null;
}
