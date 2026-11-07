# Lwkfall

Tiny, dependency-free falling effects for any website. Pick leaves, autumn, maple, ginkgo, cherry blossom, rose petals, snow or embers, and switch between them at runtime.

- About 7 KB gzipped, no dependencies, one `<canvas>`
- Leaves flip and tumble in 3D-looking motion instead of sliding down like confetti
- Works with plain JavaScript, any bundler, a `<script>` tag, and React
- Fullscreen overlay or scoped to a single element
- Pauses when the tab is hidden or the element scrolls out of view
- Respects `prefers-reduced-motion`
- Server-safe: calling it during SSR does nothing instead of crashing
- Written in TypeScript, types included

## Install

```bash
npm install lwkfall
```

Or load it from a CDN:

```html
<script src="https://unpkg.com/lwkfall"></script>
<script>
  Lwkfall.fall("sakura");
</script>
```

## Quick start

```js
import { fall } from "lwkfall";

const fx = fall("sakura");   // starts right away

fx.setPreset("snow");        // old petals finish falling while snow drifts in
fx.stop();                   // pause
fx.start();                  // resume
fx.destroy();                // remove the canvas and every listener
```

## Presets

| Name | Looks like | Also accepts |
| --- | --- | --- |
| `leaves` | Simple green leaves | `leaf`, `green` |
| `autumn` | Mixed maple, oak, ginkgo and plain leaves in reds, oranges and golds | `fall` |
| `maple` | Red and orange maple leaves | |
| `ginkgo` | Golden fan-shaped ginkgo leaves | |
| `sakura` | Pink cherry blossom petals | `cherry-blossom`, `cherry`, `blossom` |
| `petals` | Deep red rose petals | `rose`, `rose-petals` |
| `snow` | Snowflakes and soft snowballs | `snowflakes` |
| `embers` | Glowing sparks that rise instead of fall | |

Get the full list in code, handy for building a picker:

```js
import { listPresets, getPreset } from "lwkfall";

listPresets();                 // ["leaves", "autumn", ...]
getPreset("sakura").label;     // "Cherry blossom"
```

## Options

Pass options as the second argument, or change them later with `fx.setOptions()`.

```js
fall("autumn", {
  density: 1.5,
  wind: 40,
  interactive: true,
});
```

| Option | Default | What it does |
| --- | --- | --- |
| `container` | none | Element or CSS selector to render inside. Omit for a fullscreen overlay. |
| `count` | auto | Exact number of particles. Overrides `density`. |
| `density` | `1` | Multiplier on how many particles appear for the screen size. |
| `maxParticles` | `400` | Upper limit for the automatic count. |
| `speed` | `1` | Multiplier on fall speed. |
| `size` | `1` | Multiplier on particle size. |
| `wind` | preset | Sideways wind in px per second. Negative blows left. |
| `opacity` | `1` | Multiplier on opacity. |
| `zIndex` | `9999` | z-index of the canvas. Use `0` to put it behind your content. |
| `interactive` | `false` | Particles drift away from the pointer. |
| `pointerRadius` | `120` | How far the pointer reaches, in px. |
| `respectReducedMotion` | `true` | Stay still when the OS asks for reduced motion. |
| `autoStart` | `true` | Start animating immediately. |
| `seed` | random | Fixed seed for a repeatable layout. Useful for screenshots and tests. |

## Controller

`fall()` returns a controller.

| Member | Description |
| --- | --- |
| `start()` / `stop()` | Resume or pause. Particles stay where they are. |
| `toggle()` | Flip between the two and return the new running state. |
| `setPreset(nameOrPreset)` | Switch effect. Throws a readable error for unknown names and keeps the current effect. |
| `setOptions(partial)` | Change options on the fly. |
| `destroy()` | Stop and remove the canvas and listeners. |
| `running` | `true` after `start()`, `false` after `stop()`. |
| `preset` | Name of the active preset. |
| `reducedMotion` | `true` when held back by the OS setting. |
| `particleCount` | Particles currently alive. |
| `canvas` | The canvas element, or `null` on the server. |

## Inside one element

```js
fall("snow", { container: "#hero" });
```

The canvas fills the element, sits above its content, and ignores pointer events. If the element is `position: static`, lwkfall sets it to `relative` and puts it back when you call `destroy()`. The effect pauses automatically while the element is off screen.

## React

```tsx
import { Lwkfall, useLwkfall } from "lwkfall/react";

// Component form: renders nothing, draws its own canvas
function App() {
  return <Lwkfall preset="sakura" density={1.2} />;
}

// Hook form: gives you the controller
function Hero() {
  const box = useRef<HTMLDivElement>(null);
  const fx = useLwkfall("snow", { target: box });

  return (
    <div ref={box}>
      <button onClick={() => fx.current?.toggle()}>Pause</button>
    </div>
  );
}
```

Changing `preset` or the options re-renders smoothly: the running effect is updated, not restarted. React 17 or newer, and `react` is an optional peer dependency, so non-React users never install it.

In Next.js, use it from a Client Component (`"use client"`). Calling `fall()` during server rendering is safe and does nothing.

## Make your own preset

Register a preset once, then use it by name. Anything you leave out is inherited from `leaves`, or from the preset named in `extends`.

```js
import { registerPreset, fall } from "lwkfall";

registerPreset("blueberry-snow", {
  extends: "snow",
  colors: ["#a5d8ff", "#74c0fc"],
  wind: -30,
});

fall("blueberry-snow");
```

You can also pass an inline definition without registering it:

```js
fall({ extends: "sakura", colors: ["#ffffff"], density: 3 });
```

Preset fields:

| Field | Meaning |
| --- | --- |
| `shapes` | Built-in shape names, or your own draw functions. |
| `colors` | Hex colors. Every shape is rendered in every color. |
| `size` | `[far, near]` size in px. |
| `speed` | `[slow, fast]` fall speed in px per second. |
| `sway`, `swayFreq` | Sideways drift amount and frequency. |
| `spin` | Flat rotation speed range in radians per second. |
| `tumble` | `0` to `1`. How strongly each particle flips and shows its edge. |
| `tumbleSpeed` | Flip speed range in radians per second. |
| `opacity` | `[far, near]` opacity. |
| `wind` | Default wind in px per second. |
| `density` | Particles per 100,000 px² of screen. |
| `direction` | `1` falls, `-1` rises. |

Built-in shapes: `leaf`, `maple`, `oak`, `ginkgo`, `petal`, `roundPetal`, `snowflake`, `snowball`, `glow`.

A custom shape is a function that draws centered on the origin. `r` is the half-size:

```js
registerPreset("confetti", {
  shapes: [
    (ctx, r, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(-r * 0.5, -r, r, r * 2);
    },
  ],
  colors: ["#ff6b6b", "#ffd43b", "#4dabf7", "#69db7c"],
  tumble: 1,
  size: [8, 16],
});
```

## How it works

Each shape is drawn once into a small offscreen sprite for every color. Every frame, particles are stamped onto the main canvas with `drawImage`, so cost stays low even with hundreds of particles.

Each particle has its own tumble phase. Flipping squashes the sprite sideways, which makes a leaf show its face and then its edge. That same flip drives two other things: a leaf facing the air falls a little slower than one on edge, and its sideways slip follows the flip. Closer particles are bigger, faster and feel more wind. Wind itself comes in slow, uneven gusts.

When you switch presets, the old particles keep falling and are removed once they leave the screen, while the new ones enter from the edge.

## Accessibility and performance

- The canvas is `aria-hidden` and never takes pointer events.
- With `prefers-reduced-motion: reduce`, nothing is drawn unless you set `respectReducedMotion: false`.
- Animation stops while the tab is hidden, and for scoped effects while the element is off screen.
- The canvas is capped at 2x device pixel ratio.
- Frame time is clamped, so returning to a background tab does not cause a jump.

## Development

```bash
npm install
npm test          # unit tests for physics, presets and SSR safety
npm run build     # ESM, CJS, types and a browser bundle in dist/
npm run dev       # rebuild on change
```

Open `demo/index.html` after building to try every effect. Add `#snow` (or any preset name) to the URL to start on that preset.

## License

MIT. Made by [Moon](https://github.com/LwkMoon).
