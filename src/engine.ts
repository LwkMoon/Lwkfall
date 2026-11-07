import { makeRng, type Rng } from "./rng";
import { resolvePreset } from "./presets";
import { shapes } from "./shapes";
import {
  recycle,
  resolveCount,
  spawnParticle,
  step,
  tumbleScale,
  windAt,
  type Particle,
  type Pointer,
  type SpawnMode,
  type Tuning,
  type World,
} from "./physics";
import type { Lwkfall, LwkfallOptions, Preset, PresetDefinition } from "./types";

const SPRITE_PX = 64;
const MAX_DPR = 2;
const MAX_FRAME = 0.05;

type ResolvedOptions = Required<
  Omit<LwkfallOptions, "container" | "count" | "wind" | "seed">
> &
  Pick<LwkfallOptions, "container" | "count" | "wind" | "seed">;

const DEFAULTS: ResolvedOptions = {
  density: 1,
  maxParticles: 400,
  speed: 1,
  size: 1,
  opacity: 1,
  zIndex: 9999,
  interactive: false,
  pointerRadius: 120,
  respectReducedMotion: true,
  autoStart: true,
};

/** Changing any of these rebuilds the particle set (old ones finish falling, new ones drift in). */
const REBUILD_KEYS: Array<keyof LwkfallOptions> = [
  "count",
  "density",
  "maxParticles",
  "speed",
  "size",
  "opacity",
];

function resolveContainer(target: HTMLElement | string | undefined): HTMLElement | null {
  if (!target) return null;
  if (typeof target !== "string") return target;
  const el = document.querySelector<HTMLElement>(target);
  if (!el) throw new Error(`lwkfall: container "${target}" was not found`);
  return el;
}

function createNoop(name: string): Lwkfall {
  return {
    start() {},
    stop() {},
    toggle: () => false,
    setPreset() {},
    setOptions() {},
    destroy() {},
    running: false,
    preset: name,
    reducedMotion: false,
    particleCount: 0,
    canvas: null,
  };
}

class Engine implements Lwkfall {
  private opts: ResolvedOptions;
  private rng: Rng;
  private presetData: Preset;
  private presetName: string;
  private container: HTMLElement | null;
  private restorePosition: string | null = null;

  private canvas_: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  private particles: Particle[] = [];
  private sheets = new Map<number, HTMLCanvasElement[]>();
  private sheetId = 0;
  private currentSheet = -1;
  private needsPrune = false;

  private world: World = { width: 0, height: 0, time: 0, wind: 0 };
  private dpr = 1;
  private pointer: Pointer | null = null;

  private wanted = false;
  private pageVisible = true;
  private inView = true;
  private reduced = false;
  private mounted = false;
  private destroyed = false;
  private raf = 0;
  private last = 0;

  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private motionQuery: MediaQueryList | null = null;

  constructor(input: string | Preset | PresetDefinition, options: LwkfallOptions) {
    this.opts = { ...DEFAULTS, ...stripUndefined(options) };
    this.rng = makeRng(this.opts.seed);
    const resolved = resolvePreset(input);
    this.presetData = resolved.preset;
    this.presetName = resolved.name;
    this.container = resolveContainer(this.opts.container);

    this.canvas_ = document.createElement("canvas");
    this.ctx = this.canvas_.getContext("2d");
    if (!this.ctx) {
      console.warn("lwkfall: 2D canvas is not available, the effect is disabled");
      this.destroyed = true;
      return;
    }
    this.applyCanvasStyle();
    this.wanted = this.opts.autoStart;
    this.init();
  }

  get canvas(): HTMLCanvasElement | null {
    return this.destroyed ? null : this.canvas_;
  }
  get running(): boolean {
    return this.wanted && !this.destroyed;
  }
  get preset(): string {
    return this.presetName;
  }
  get reducedMotion(): boolean {
    return this.reduced;
  }
  get particleCount(): number {
    return this.particles.length;
  }

  start(): void {
    this.wanted = true;
    this.sync();
  }

  stop(): void {
    this.wanted = false;
    this.sync();
  }

  toggle(): boolean {
    if (this.wanted) this.stop();
    else this.start();
    return this.wanted;
  }

  setPreset(input: string | Preset | PresetDefinition): void {
    if (this.destroyed) return;
    const resolved = resolvePreset(input);
    this.presetData = resolved.preset;
    this.presetName = resolved.name;
    if (this.mounted) this.rebuild();
  }

  setOptions(next: Partial<LwkfallOptions>): void {
    if (this.destroyed) return;
    const clean = stripUndefined(next);
    const rebuild = REBUILD_KEYS.some((k) => k in clean && clean[k] !== this.opts[k as keyof ResolvedOptions]);
    const interactiveChanged = "interactive" in clean && clean.interactive !== this.opts.interactive;
    const motionChanged =
      "respectReducedMotion" in clean && clean.respectReducedMotion !== this.opts.respectReducedMotion;

    this.opts = { ...this.opts, ...clean };
    if ("seed" in clean) this.rng = makeRng(this.opts.seed);
    this.canvas_.style.zIndex = String(this.opts.zIndex);

    if (interactiveChanged) this.bindPointer();
    if (motionChanged) this.readMotionPreference();
    if (this.mounted && rebuild) this.rebuild();
    this.sync();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.wanted = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbind();
    this.canvas_.remove();
    if (this.container && this.restorePosition !== null) this.container.style.position = this.restorePosition;
    this.particles = [];
    this.sheets.clear();
  }

  // Setup

  private applyCanvasStyle(): void {
    const s = this.canvas_.style;
    s.position = this.container ? "absolute" : "fixed";
    s.inset = "0";
    s.width = "100%";
    s.height = "100%";
    s.pointerEvents = "none";
    s.zIndex = String(this.opts.zIndex);
    this.canvas_.setAttribute("aria-hidden", "true");
    this.canvas_.setAttribute("data-lwkfall", "");
  }

  private init(): void {
    if (this.destroyed || this.mounted) return;
    const host = this.container ?? document.body;
    if (!host) {
      document.addEventListener("DOMContentLoaded", () => this.init(), { once: true });
      return;
    }
    if (this.container && getComputedStyle(this.container).position === "static") {
      this.restorePosition = this.container.style.position;
      this.container.style.position = "relative";
    }
    host.appendChild(this.canvas_);
    this.mounted = true;
    this.measure();
    this.rebuild("scatter", false);
    this.bind();
    this.sync();
  }

  private bind(): void {
    document.addEventListener("visibilitychange", this.onVisibility);
    this.pageVisible = document.visibilityState !== "hidden";
    if (this.container) {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.container);
      this.intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) {
          this.inView = entry.isIntersecting;
          this.sync();
        }
      });
      this.intersectionObserver.observe(this.container);
    } else {
      window.addEventListener("resize", this.onResize);
    }
    if (typeof window.matchMedia === "function") {
      this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.motionQuery.addEventListener?.("change", this.readMotionPreference);
    }
    this.readMotionPreference();
    this.bindPointer();
  }

  private unbind(): void {
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.documentElement.removeEventListener("mouseleave", this.onPointerLeave);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.motionQuery?.removeEventListener?.("change", this.readMotionPreference);
  }

  private bindPointer(): void {
    window.removeEventListener("pointermove", this.onPointerMove);
    document.documentElement.removeEventListener("mouseleave", this.onPointerLeave);
    this.pointer = null;
    if (this.opts.interactive) {
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", this.onPointerLeave);
    }
  }

  // Event handlers 

  private onVisibility = (): void => {
    this.pageVisible = document.visibilityState !== "hidden";
    this.sync();
  };

  private onResize = (): void => {
    const oldDpr = this.dpr;
    this.measure();
    if (this.dpr !== oldDpr) this.rebuild("scatter");
    else this.fitCount();
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas_.getBoundingClientRect();
    this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, radius: this.opts.pointerRadius };
  };

  private onPointerLeave = (): void => {
    this.pointer = null;
  };

  private readMotionPreference = (): void => {
    this.reduced = this.opts.respectReducedMotion && !!this.motionQuery?.matches;
    this.sync();
  };

  // Layout and particles

  private measure(): void {
    const w = this.container ? this.container.clientWidth : window.innerWidth;
    const h = this.container ? this.container.clientHeight : window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas_.width = Math.max(1, Math.round(w * this.dpr));
    this.canvas_.height = Math.max(1, Math.round(h * this.dpr));
    this.world.width = w;
    this.world.height = h;
  }

  private tuning(): Tuning {
    const o = this.opts;
    return {
      count: o.count,
      density: o.density,
      maxParticles: o.maxParticles,
      speed: o.speed,
      size: o.size,
      opacity: o.opacity,
    };
  }

  private targetCount(): number {
    return resolveCount(this.world.width * this.world.height, this.presetData.density, this.tuning());
  }

  private buildSheet(): number {
    const sprites: HTMLCanvasElement[] = [];
    const px = Math.round(SPRITE_PX * this.dpr);
    for (const color of this.presetData.colors) {
      for (const shape of this.presetData.shapes) {
        const draw = typeof shape === "function" ? shape : shapes[shape];
        const c = document.createElement("canvas");
        c.width = c.height = px;
        const g = c.getContext("2d");
        if (!g) continue;
        g.translate(px / 2, px / 2);
        draw(g, (px / 2) * 0.9, color);
        sprites.push(c);
      }
    }
    const id = ++this.sheetId;
    this.sheets.set(id, sprites);
    this.currentSheet = id;
    return id;
  }

  private rebuild(mode: SpawnMode = "stream", retire = true): void {
    if (this.world.width === 0 || this.world.height === 0) return;
    if (retire) for (const p of this.particles) p.retiring = true;
    const sheet = this.buildSheet();
    const count = (this.sheets.get(sheet) ?? []).length;
    const target = this.targetCount();
    for (let i = 0; i < target; i++) {
      this.particles.push(spawnParticle(this.rng, this.presetData, this.tuning(), this.world, sheet, count, mode));
    }
    this.needsPrune = true;
    if (!this.raf) this.draw();
  }

  private fitCount(): void {
    if (this.world.width === 0 || this.world.height === 0) return;
    const live = this.particles.filter((p) => !p.retiring).length;
    const target = this.targetCount();
    if (live < target) {
      const count = (this.sheets.get(this.currentSheet) ?? []).length;
      for (let i = live; i < target; i++) {
        this.particles.push(
          spawnParticle(this.rng, this.presetData, this.tuning(), this.world, this.currentSheet, count, "scatter"),
        );
      }
    } else if (live > target) {
      let extra = live - target;
      for (let i = this.particles.length - 1; i >= 0 && extra > 0; i--) {
        if (!this.particles[i]?.retiring) {
          this.particles.splice(i, 1);
          extra--;
        }
      }
    }
    if (!this.raf) this.draw();
  }

  private prune(): void {
    const used = new Set<number>();
    for (const p of this.particles) used.add(p.sheet);
    used.add(this.currentSheet);
    for (const id of this.sheets.keys()) if (!used.has(id)) this.sheets.delete(id);
    this.needsPrune = false;
  }

  // Loop

  private shouldRun(): boolean {
    return this.wanted && !this.destroyed && this.mounted && this.pageVisible && this.inView && !this.reduced;
  }

  private sync(): void {
    if (this.destroyed) return;
    const should = this.shouldRun();
    if (should && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!should && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    if (this.reduced && this.mounted) this.clear();
  }

  private frame = (now: number): void => {
    this.raf = 0;
    if (!this.shouldRun()) return;
    const dt = Math.min((now - this.last) / 1000, MAX_FRAME);
    this.last = now;
    this.world.time += dt;
    this.world.wind = windAt(this.world.time, this.opts.wind ?? this.presetData.wind);
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    const list = this.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i] as Particle;
      if (step(p, dt, this.world, this.pointer)) continue;
      if (p.retiring) {
        list[i] = list[list.length - 1] as Particle;
        list.pop();
        this.needsPrune = true;
      } else {
        recycle(p, this.rng, this.world);
      }
    }
    if (this.needsPrune) this.prune();
  }

  private clear(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || this.reduced) return;
    const dpr = this.dpr;
    this.clear();
    for (const p of this.particles) {
      const sprite = this.sheets.get(p.sheet)?.[p.sprite];
      if (!sprite) continue;
      const sx = tumbleScale(p);
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      ctx.globalAlpha = p.opacity * (0.65 + 0.35 * sx);
      ctx.setTransform(c * sx * dpr, s * sx * dpr, -s * dpr, c * dpr, p.x * dpr, p.y * dpr);
      const half = p.size / 2;
      ctx.drawImage(sprite, -half, -half, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}


export function fall(
  preset: string | Preset | PresetDefinition = "leaves",
  options: LwkfallOptions = {},
): Lwkfall {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return createNoop(typeof preset === "string" ? preset : "custom");
  }
  return new Engine(preset, options);
}
