import { describe, expect, it } from "vitest";
import { getPreset, listPresets, registerPreset, resolvePreset, validatePreset } from "../src/presets";
import { shapeNames } from "../src/shapes";

describe("built-in presets", () => {
  it("ships the expected effects", () => {
    for (const name of ["leaves", "autumn", "maple", "ginkgo", "sakura", "petals", "snow", "embers"]) {
      expect(listPresets()).toContain(name);
    }
  });

  it("are all valid", () => {
    for (const name of listPresets()) {
      expect(() => validatePreset(getPreset(name)!)).not.toThrow();
    }
  });

  it("only use shapes that exist", () => {
    for (const name of listPresets()) {
      for (const s of getPreset(name)!.shapes) {
        if (typeof s === "string") expect(shapeNames).toContain(s);
      }
    }
  });

  it("resolves friendly aliases", () => {
    expect(resolvePreset("cherry-blossom").name).toBe("sakura");
    expect(resolvePreset("Snowflakes").name).toBe("snow");
    expect(resolvePreset("rose").name).toBe("petals");
  });

  it("explains unknown names", () => {
    expect(() => resolvePreset("tornado")).toThrow(/Available: .*leaves/);
  });
});

describe("registerPreset", () => {
  it("inherits missing fields from leaves by default", () => {
    const p = registerPreset("test-lime", { colors: ["#a4de02"] });
    expect(p.colors).toEqual(["#a4de02"]);
    expect(p.shapes).toEqual(getPreset("leaves")!.shapes);
    expect(listPresets()).toContain("test-lime");
  });

  it("can extend another preset", () => {
    const p = registerPreset("test-blue-snow", { extends: "snow", colors: ["#a5d8ff"] });
    expect(p.shapes).toEqual(getPreset("snow")!.shapes);
    expect(p.colors).toEqual(["#a5d8ff"]);
  });

  it("accepts custom draw functions", () => {
    const draw = () => {};
    const p = registerPreset("test-fn", { shapes: [draw] });
    expect(p.shapes[0]).toBe(draw);
  });

  it("rejects bad input with a useful message", () => {
    expect(() => registerPreset("bad-color", { colors: ["tomato"] })).toThrow(/hex/);
    expect(() => registerPreset("bad-shape", { shapes: ["triangle" as never] })).toThrow(/unknown shape/);
    expect(() => registerPreset("bad-tumble", { tumble: 3 })).toThrow(/tumble/);
    expect(() => registerPreset("bad-extends", { extends: "nope" })).toThrow(/unknown preset/);
    expect(() => registerPreset("bad-empty", { colors: [] })).toThrow(/color/);
    expect(() => registerPreset("  ", {})).toThrow(/empty/);
  });

  it("treats inline definitions as custom", () => {
    expect(resolvePreset({ colors: ["#ffffff"] }).name).toBe("custom");
  });
});
