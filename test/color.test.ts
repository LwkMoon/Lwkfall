import { describe, expect, it } from "vitest";
import { isHex, parseHex, rgba, shade } from "../src/color";

describe("color helpers", () => {
  it("parses 3 and 6 digit hex", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("#ff8800")).toEqual([255, 136, 0]);
  });

  it("rejects anything that is not hex", () => {
    expect(parseHex("red")).toBeNull();
    expect(isHex("rgb(1,2,3)")).toBe(false);
    expect(isHex("#12")).toBe(false);
  });

  it("lightens and darkens", () => {
    expect(shade("#000000", 1)).toBe("rgb(255, 255, 255)");
    expect(shade("#ffffff", -1)).toBe("rgb(0, 0, 0)");
    expect(shade("#808080", 0)).toBe("rgb(128, 128, 128)");
  });

  it("returns non-hex input untouched", () => {
    expect(shade("tomato", 0.5)).toBe("tomato");
    expect(rgba("tomato", 0.5)).toBe("tomato");
  });

  it("builds rgba strings", () => {
    expect(rgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });
});
