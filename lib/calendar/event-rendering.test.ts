import { describe, expect, it } from "vitest";
import { getTextColorForBackground } from "./event-rendering";

describe("getTextColorForBackground", () => {
  it("returns white text on dark background", () => {
    expect(getTextColorForBackground("#000000")).toBe("#ffffff");
    expect(getTextColorForBackground("#222222")).toBe("#ffffff");
  });

  it("returns black text on light background", () => {
    expect(getTextColorForBackground("#ffffff")).toBe("#000000");
    expect(getTextColorForBackground("#ffff00")).toBe("#000000");
  });

  it("uses YIQ-weighted brightness (green weighed heaviest)", () => {
    // pure blue is darker than pure green by YIQ weights
    expect(getTextColorForBackground("#0000ff")).toBe("#ffffff");
    expect(getTextColorForBackground("#00ff00")).toBe("#000000");
  });

  it("accepts color string without leading #", () => {
    expect(getTextColorForBackground("ffffff")).toBe("#000000");
  });

  it("returns white at brightness exactly < 128", () => {
    // bg with brightness 127.xxx
    expect(getTextColorForBackground("#404040")).toBe("#ffffff");
  });
});
