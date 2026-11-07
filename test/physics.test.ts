import { describe, expect, it } from "vitest";
import { getPreset } from "../src/presets";
import { mulberry32 } from "../src/rng";
import {
  recycle,
  resolveCount,
  spawnParticle,
  step,
  tumbleScale,
  windAt,
  type Particle,
  type Tuning,
  type World,
} from "../src/physics";

const tuning: Tuning = { density: 1, maxParticles: 400, speed: 1, size: 1, opacity: 1 };
const world: World = { width: 1000, height: 600, time: 0, wind: 0 };
const leaves = getPreset("leaves")!;
const embers = getPreset("embers")!;

describe("mulberry32", () => {
  it("is repeatable for the same seed", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays inside [0, 1)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("resolveCount", () => {
  it("scales with screen area", () => {
    const small = resolveCount(500_000, 4, tuning);
    const large = resolveCount(2_000_000, 4, tuning);
    expect(large).toBeGreaterThan(small);
  });

  it("never drops below a small floor", () => {
    expect(resolveCount(100, 1, tuning)).toBe(6);
  });

  it("respects maxParticles", () => {
    expect(resolveCount(50_000_000, 10, tuning)).toBe(400);
  });

  it("uses an explicit count when given", () => {
    expect(resolveCount(2_000_000, 4, { ...tuning, count: 25 })).toBe(25);
  });

  it("applies the density multiplier", () => {
    const base = resolveCount(2_000_000, 3, tuning);
    const doubled = resolveCount(2_000_000, 3, { ...tuning, density: 2 });
    expect(doubled).toBe(base * 2);
  });
});

describe("spawnParticle", () => {
  it("scatters inside the screen", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const p = spawnParticle(rng, leaves, tuning, world, 1, 10, "scatter");
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(world.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(world.height);
      expect(p.sprite).toBeLessThan(10);
      expect(p.size).toBeGreaterThanOrEqual(leaves.size[0]);
      expect(p.size).toBeLessThanOrEqual(leaves.size[1]);
    }
  });

  it("streams in from above for falling presets", () => {
    const rng = mulberry32(3);
    const p = spawnParticle(rng, leaves, tuning, world, 1, 4, "stream");
    expect(p.y).toBeLessThan(0);
    expect(p.dir).toBe(1);
  });

  it("streams in from below for rising presets", () => {
    const rng = mulberry32(3);
    const p = spawnParticle(rng, embers, tuning, world, 1, 4, "stream");
    expect(p.y).toBeGreaterThan(world.height);
    expect(p.dir).toBe(-1);
  });

  it("applies size and speed multipliers", () => {
    const a = spawnParticle(mulberry32(5), leaves, tuning, world, 1, 4, "scatter");
    const b = spawnParticle(mulberry32(5), leaves, { ...tuning, size: 2, speed: 3 }, world, 1, 4, "scatter");
    expect(b.size).toBeCloseTo(a.size * 2);
    expect(b.fall).toBeCloseTo(a.fall * 3);
  });
});

describe("tumbleScale", () => {
  it("is always 1 when tumble is off", () => {
    expect(tumbleScale({ tumble: 0, tumblePhase: 1.3 })).toBe(1);
  });

  it("shows the full face at phase 0 and a thin edge at a right angle", () => {
    expect(tumbleScale({ tumble: 1, tumblePhase: 0 })).toBeCloseTo(1);
    const edge = tumbleScale({ tumble: 1, tumblePhase: Math.PI / 2 });
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(0.2);
  });
});

describe("windAt", () => {
  it("scales with the base wind and stays finite", () => {
    expect(windAt(10, 0)).toBe(0);
    for (let t = 0; t < 60; t += 0.7) expect(Number.isFinite(windAt(t, 20))).toBe(true);
  });
});

function particle(overrides: Partial<Particle> = {}): Particle {
  return {
    x: 500,
    y: 100,
    size: 20,
    fall: 60,
    depth: 0.5,
    swayAmp: 0,
    swayFreq: 1,
    swayPhase: 0,
    rot: 0,
    spin: 0,
    tumble: 0,
    tumblePhase: 0,
    tumbleSpeed: 0,
    opacity: 1,
    dir: 1,
    sheet: 1,
    sprite: 0,
    retiring: false,
    pushX: 0,
    pushY: 0,
    ...overrides,
  };
}

describe("step", () => {
  it("moves a falling particle down", () => {
    const p = particle();
    step(p, 1, world, null);
    expect(p.y).toBeCloseTo(160);
  });

  it("moves a rising particle up", () => {
    const p = particle({ dir: -1 });
    step(p, 1, world, null);
    expect(p.y).toBeCloseTo(40);
  });

  it("reports leaving through the exit edge", () => {
    expect(step(particle({ y: world.height + 50 }), 0.016, world, null)).toBe(false);
    expect(step(particle({ y: 100 }), 0.016, world, null)).toBe(true);
    expect(step(particle({ dir: -1, y: -50 }), 0.016, world, null)).toBe(false);
  });

  it("does not count the entry edge as leaving", () => {
    expect(step(particle({ y: -500 }), 0.016, world, null)).toBe(true);
  });

  it("wraps horizontally", () => {
    const p = particle({ x: -100 });
    step(p, 0.016, world, null);
    expect(p.x).toBeGreaterThan(world.width);
  });

  it("falls slower when facing the air than when on edge", () => {
    const face = particle({ tumble: 1, tumblePhase: 0 });
    const edge = particle({ tumble: 1, tumblePhase: Math.PI / 2 });
    step(face, 0.1, world, null);
    step(edge, 0.1, world, null);
    expect(face.y).toBeLessThan(edge.y);
  });

  it("pushes particles away from the pointer", () => {
    const p = particle({ x: 520, y: 100 });
    step(p, 0.016, world, { x: 500, y: 100, radius: 120 });
    expect(p.pushX).toBeGreaterThan(0);
    const q = particle({ x: 480, y: 100 });
    step(q, 0.016, world, { x: 500, y: 100, radius: 120 });
    expect(q.pushX).toBeLessThan(0);
  });

  it("ignores a pointer that is far away", () => {
    const p = particle();
    step(p, 0.016, world, { x: 0, y: 0, radius: 50 });
    expect(p.pushX).toBe(0);
  });

  it("blows near particles further than far ones", () => {
    const near = particle({ depth: 1 });
    const far = particle({ depth: 0 });
    step(near, 1, { ...world, wind: 50 }, null);
    step(far, 1, { ...world, wind: 50 }, null);
    expect(near.x - 500).toBeGreaterThan(far.x - 500);
  });
});

describe("recycle", () => {
  it("returns a particle to its entry edge", () => {
    const rng = mulberry32(9);
    const down = particle({ y: 9999 });
    recycle(down, rng, world);
    expect(down.y).toBeLessThan(0);
    const up = particle({ dir: -1, y: -9999 });
    recycle(up, rng, world);
    expect(up.y).toBeGreaterThan(world.height);
  });
});
