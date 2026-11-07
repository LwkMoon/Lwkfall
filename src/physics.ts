import { between, clamp, lerp, type Rng } from "./rng";
import type { Preset } from "./types";

export interface Particle {
  x: number;
  y: number;
  size: number;
  /** Fall speed in px per second. */
  fall: number;
  /** 0 (far) to 1 (near). Near particles are bigger, faster and feel more wind. */
  depth: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  rot: number;
  spin: number;
  tumble: number;
  tumblePhase: number;
  tumbleSpeed: number;
  opacity: number;
  dir: 1 | -1;
  /** Which rendered sprite sheet this particle belongs to. */
  sheet: number;
  /** Index inside that sprite sheet. */
  sprite: number;
  /** Finishing its fall after a preset switch. Removed once off screen. */
  retiring: boolean;
  pushX: number;
  pushY: number;
}

export interface World {
  width: number;
  height: number;
  time: number;
  /** Current wind in px per second, already including gusts. */
  wind: number;
}

export interface Pointer {
  x: number;
  y: number;
  radius: number;
}

export interface Tuning {
  count?: number;
  density: number;
  maxParticles: number;
  speed: number;
  size: number;
  opacity: number;
}

const HARD_CAP = 2000;
const MIN_AUTO = 6;
const MIN_FLIP_WIDTH = 0.12;

/** How many particles a screen of this size should hold. */
export function resolveCount(area: number, presetDensity: number, t: Tuning): number {
  if (t.count !== undefined) return clamp(Math.round(t.count), 0, HARD_CAP);
  const auto = Math.round((area / 100_000) * presetDensity * t.density);
  return clamp(auto, MIN_AUTO, Math.max(MIN_AUTO, t.maxParticles));
}

/** Wind with slow, uneven gusts layered on top of the base value. */
export function windAt(time: number, base: number): number {
  return base * (1 + 0.5 * Math.sin(time * 0.4) + 0.25 * Math.sin(time * 1.1 + 1.3));
}

/** Horizontal squash of the sprite as it flips. 1 shows the full face. */
export function tumbleScale(p: Pick<Particle, "tumble" | "tumblePhase">): number {
  const face = Math.max(MIN_FLIP_WIDTH, Math.abs(Math.cos(p.tumblePhase)));
  return 1 - p.tumble * (1 - face);
}

/**
 * "scatter" fills the whole screen (first paint).
 * "stream" starts beyond the entry edge so new particles drift in over a few seconds.
 */
export type SpawnMode = "scatter" | "stream";

export function spawnParticle(
  rng: Rng,
  preset: Preset,
  t: Tuning,
  world: Pick<World, "width" | "height">,
  sheet: number,
  spriteCount: number,
  mode: SpawnMode,
): Particle {
  const depth = rng();
  const size = lerp(preset.size[0], preset.size[1], Math.pow(depth, 1.4)) * t.size;
  const fall = lerp(preset.speed[0], preset.speed[1], clamp(depth * 0.7 + rng() * 0.3, 0, 1)) * t.speed;
  const dir = preset.direction ?? 1;
  let y: number;
  if (mode === "scatter") {
    y = rng() * world.height;
  } else {
    y = dir === 1 ? -size - rng() * world.height : world.height + size + rng() * world.height;
  }
  return {
    x: rng() * world.width,
    y,
    size,
    fall,
    depth,
    swayAmp: between(rng, preset.sway),
    swayFreq: between(rng, preset.swayFreq),
    swayPhase: rng() * Math.PI * 2,
    rot: rng() * Math.PI * 2,
    spin: between(rng, preset.spin),
    tumble: preset.tumble,
    tumblePhase: rng() * Math.PI * 2,
    tumbleSpeed: between(rng, preset.tumbleSpeed),
    opacity: clamp(lerp(preset.opacity[0], preset.opacity[1], depth) * t.opacity, 0, 1),
    dir,
    sheet,
    sprite: Math.floor(rng() * Math.max(1, spriteCount)),
    retiring: false,
    pushX: 0,
    pushY: 0,
  };
}

/** Send a particle that left the screen back to its entry edge at a new x. */
export function recycle(p: Particle, rng: Rng, world: Pick<World, "width" | "height">): void {
  const lead = p.size * (1 + rng() * 2);
  p.x = rng() * world.width;
  p.y = p.dir === 1 ? -lead : world.height + lead;
  p.pushX = 0;
  p.pushY = 0;
}

/**
 * Advance one particle. Returns false once it has left through the exit edge.
 * Horizontal edges wrap around.
 */
export function step(p: Particle, dt: number, world: World, pointer: Pointer | null): boolean {
  p.tumblePhase += p.tumbleSpeed * dt;
  p.rot += p.spin * dt;

  // A leaf showing its full face catches more air and falls slower than one on edge.
  const face = Math.abs(Math.cos(p.tumblePhase)) * p.tumble;
  const fall = p.fall * (1 - 0.3 * face);

  // Sideways slip follows the flip, so the motion reads as one gesture.
  const sway = Math.cos(p.swayPhase + world.time * p.swayFreq) * p.swayAmp;
  const slip = Math.sin(p.tumblePhase) * p.tumble * p.swayAmp * 0.6;
  const wind = world.wind * (0.4 + 0.6 * p.depth);

  if (pointer) {
    const dx = p.x - pointer.x;
    const dy = p.y - pointer.y;
    const d = Math.hypot(dx, dy);
    if (d < pointer.radius && d > 0.001) {
      const f = 1 - d / pointer.radius;
      const k = f * f * 900 * dt;
      p.pushX += (dx / d) * k;
      p.pushY += (dy / d) * k;
    }
  }
  const decay = Math.exp(-2.5 * dt);
  p.pushX *= decay;
  p.pushY *= decay;

  p.y += (p.dir * fall + p.pushY) * dt;
  p.x += (sway + slip + wind + p.pushX) * dt;

  const margin = p.size;
  if (p.x < -margin) p.x = world.width + margin;
  else if (p.x > world.width + margin) p.x = -margin;

  return p.dir === 1 ? p.y <= world.height + margin : p.y >= -margin;
}
