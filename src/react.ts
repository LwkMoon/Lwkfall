import { useEffect, useRef, type RefObject } from "react";
import { fall } from "./engine";
import type { Lwkfall as LwkfallController, LwkfallOptions, Preset, PresetDefinition } from "./types";

export interface UseLwkfallOptions extends Omit<LwkfallOptions, "container"> {
  /** Ref of an element to render inside. Omit for a fullscreen overlay. */
  target?: RefObject<HTMLElement | null>;
  /** Set to false to turn the effect off. Default true. */
  enabled?: boolean;
}

type PresetInput = string | Preset | PresetDefinition;

/** Stable signature so inline preset objects do not restart the effect on every render. */
const signature = (p: PresetInput): string =>
  typeof p === "string" ? p : JSON.stringify(p, (_k, v) => (typeof v === "function" ? "fn" : v));

/**
 * Run a falling effect for as long as the component is mounted.
 * Returns a ref holding the controller (null until mounted, and on the server).
 *
 * ```tsx
 * const fx = useLwkfall("sakura", { density: 1.2 });
 * <button onClick={() => fx.current?.toggle()}>Pause</button>
 * ```
 */
export function useLwkfall(
  preset: PresetInput = "leaves",
  options: UseLwkfallOptions = {},
): RefObject<LwkfallController | null> {
  const { target, enabled = true, ...rest } = options;
  const instance = useRef<LwkfallController | null>(null);
  const applied = useRef({ preset: "", options: "" });

  const latest = useRef({ preset, rest, target });
  latest.current = { preset, rest, target };

  const presetSig = signature(preset);
  const optionsSig = JSON.stringify(rest);

  // Create on mount (or when toggled on) and clean up on unmount.
  useEffect(() => {
    if (!enabled) return;
    const { preset: p, rest: o, target: t } = latest.current;
    const fx = fall(p, { ...o, container: t?.current ?? undefined });
    instance.current = fx;
    applied.current = { preset: signature(p), options: JSON.stringify(o) };
    return () => {
      fx.destroy();
      instance.current = null;
    };
  }, [enabled]);

  // Keep the running effect in sync with props.
  useEffect(() => {
    const fx = instance.current;
    if (!fx) return;
    if (applied.current.preset !== presetSig) {
      applied.current.preset = presetSig;
      fx.setPreset(latest.current.preset);
    }
    if (applied.current.options !== optionsSig) {
      applied.current.options = optionsSig;
      fx.setOptions(latest.current.rest);
    }
  }, [presetSig, optionsSig]);

  return instance;
}

export interface LwkfallProps extends UseLwkfallOptions {
  preset?: PresetInput;
}

/** Component form of the hook. Renders nothing, the effect draws its own canvas. */
export function Lwkfall({ preset = "leaves", ...options }: LwkfallProps): null {
  useLwkfall(preset, options);
  return null;
}

export type { LwkfallController, LwkfallOptions, Preset, PresetDefinition };
