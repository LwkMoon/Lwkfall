import { describe, expect, it } from "vitest";
import { fall } from "../src";

describe("server side rendering", () => {
  it("returns an inert controller when there is no DOM", () => {
    const fx = fall("sakura");
    expect(fx.canvas).toBeNull();
    expect(fx.running).toBe(false);
    expect(fx.preset).toBe("sakura");
    expect(fx.particleCount).toBe(0);
    expect(() => {
      fx.start();
      fx.stop();
      fx.setPreset("snow");
      fx.setOptions({ density: 2 });
      fx.destroy();
    }).not.toThrow();
    expect(fx.toggle()).toBe(false);
  });
});
