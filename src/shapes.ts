import { rgba, shade } from "./color";
import type { ShapeFn, ShapeName } from "./types";

const TAU = Math.PI * 2;
const rad = (deg: number): number => (deg * Math.PI) / 180;

function veins(ctx: CanvasRenderingContext2D, r: number, stroke: string): void {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(0, r);
  for (let i = 0; i < 3; i++) {
    const y = -r * 0.35 + i * r * 0.35;
    ctx.moveTo(0, y + r * 0.18);
    ctx.lineTo(r * 0.38, y - r * 0.12);
    ctx.moveTo(0, y + r * 0.18);
    ctx.lineTo(-r * 0.38, y - r * 0.12);
  }
  ctx.stroke();
}

function verticalFill(ctx: CanvasRenderingContext2D, r: number, color: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, shade(color, 0.12));
  g.addColorStop(1, shade(color, -0.14));
  return g;
}

const leaf: ShapeFn = (ctx, r, color) => {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.8, -r * 0.45, r * 0.7, r * 0.55, 0, r);
  ctx.bezierCurveTo(-r * 0.7, r * 0.55, -r * 0.8, -r * 0.45, 0, -r);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r * 0.6, 0, r * 0.6, 0);
  g.addColorStop(0, shade(color, 0.14));
  g.addColorStop(1, shade(color, -0.14));
  ctx.fillStyle = g;
  ctx.fill();
  veins(ctx, r, shade(color, -0.32));
};

const maple: ShapeFn = (ctx, r, color) => {
  // [angle in degrees, reach]. Angles are measured clockwise from the right, -90 points up.
  const lobes: Array<[number, number]> = [
    [-210, 0.55],
    [-148, 0.85],
    [-90, 1],
    [-32, 0.85],
    [30, 0.55],
  ];
  const pts: Array<[number, number]> = [[0, r * 0.42]];
  lobes.forEach(([a, reach], i) => {
    const prev = lobes[i - 1];
    if (prev) {
      const mid = rad((prev[0] + a) / 2);
      pts.push([Math.cos(mid) * r * 0.38, Math.sin(mid) * r * 0.38]);
    }
    for (const [da, k] of [
      [-10, 0.62],
      [0, 1],
      [10, 0.62],
    ] as const) {
      const ang = rad(a + da);
      pts.push([Math.cos(ang) * r * reach * k, Math.sin(ang) * r * reach * k]);
    }
  });
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = verticalFill(ctx, r, color);
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.strokeStyle = shade(color, -0.32);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [a, reach] of lobes) {
    ctx.moveTo(0, r * 0.42);
    ctx.lineTo(Math.cos(rad(a)) * r * reach * 0.78, Math.sin(rad(a)) * r * reach * 0.78);
  }
  ctx.moveTo(0, r * 0.42);
  ctx.lineTo(0, r * 0.98);
  ctx.stroke();
};

const oak: ShapeFn = (ctx, r, color) => {
  const lobes = 3;
  const steps = 36;
  const half = (t: number): number =>
    0.55 * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.72 + 0.28 * Math.cos(TAU * lobes * t));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = half(t) * r;
    const y = -r + 2 * r * t;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    ctx.lineTo(-half(t) * r, -r + 2 * r * t);
  }
  ctx.closePath();
  ctx.fillStyle = verticalFill(ctx, r, color);
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = r * 0.06;
  ctx.strokeStyle = color;
  ctx.stroke();
  veins(ctx, r, shade(color, -0.32));
};

const ginkgo: ShapeFn = (ctx, r, color) => {
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(-r * 0.9, -r * 0.35);
  ctx.quadraticCurveTo(-r * 0.55, -r * 1.0, -r * 0.08, -r * 0.8);
  ctx.lineTo(0, -r * 0.55);
  ctx.lineTo(r * 0.08, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.55, -r * 1.0, r * 0.9, -r * 0.35);
  ctx.closePath();
  ctx.fillStyle = verticalFill(ctx, r, color);
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.strokeStyle = shade(color, -0.3);
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  for (const k of [-0.62, -0.3, 0, 0.3, 0.62]) {
    ctx.moveTo(0, r * 0.95);
    ctx.lineTo(k * r * 1.25, -r * (0.82 - Math.abs(k) * 0.35));
  }
  ctx.stroke();
};

const petal: ShapeFn = (ctx, r, color) => {
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 0.95, r * 0.3, -r * 0.7, -r * 0.75, -r * 0.16, -r * 0.92);
  ctx.lineTo(0, -r * 0.66);
  ctx.lineTo(r * 0.16, -r * 0.92);
  ctx.bezierCurveTo(r * 0.7, -r * 0.75, r * 0.95, r * 0.3, 0, r * 0.9);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, r, 0, -r);
  g.addColorStop(0, shade(color, -0.16));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, 0.18));
  ctx.fillStyle = g;
  ctx.fill();
};

const roundPetal: ShapeFn = (ctx, r, color) => {
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(-r * 0.9, r * 0.55, -r * 0.85, -r * 0.6, -r * 0.1, -r * 0.95);
  ctx.bezierCurveTo(r * 0.6, -r * 0.85, r * 0.95, r * 0.35, 0, r);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, r, 0, -r);
  g.addColorStop(0, shade(color, -0.28));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, 0.1));
  ctx.fillStyle = g;
  ctx.fill();
};

const snowflake: ShapeFn = (ctx, r, color) => {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  ctx.shadowColor = rgba(color, 0.8);
  ctx.shadowBlur = r * 0.18;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * TAU) / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r * 0.95);
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(r * 0.26, -r * 0.7);
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(-r * 0.26, -r * 0.7);
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(r * 0.17, -r * 0.88);
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(-r * 0.17, -r * 0.88);
    ctx.stroke();
    ctx.restore();
  }
};

const snowball: ShapeFn = (ctx, r, color) => {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, 0.95));
  g.addColorStop(0.55, rgba(color, 0.5));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
};

const glow: ShapeFn = (ctx, r, color) => {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, shade(color, 0.6));
  g.addColorStop(0.22, color);
  g.addColorStop(0.6, rgba(color, 0.32));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
};

export const shapes: Record<ShapeName, ShapeFn> = {
  leaf,
  maple,
  oak,
  ginkgo,
  petal,
  roundPetal,
  snowflake,
  snowball,
  glow,
};

export const shapeNames = Object.keys(shapes) as ShapeName[];
