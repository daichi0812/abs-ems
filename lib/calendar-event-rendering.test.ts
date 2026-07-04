import { describe, expect, it } from "vitest";
import {
  formatDate1,
  formatDate2,
  getTextColorForBackground,
} from "./calendar-event-rendering";

describe("formatDate1", () => {
  it("formats Date object as MM月DD日 with zero padding", () => {
    expect(formatDate1(new Date(2026, 0, 5))).toBe("01月05日");
  });

  it("formats date string the same way", () => {
    expect(formatDate1("2026-12-31")).toBe("12月31日");
  });

  it("zero-pads single-digit days", () => {
    expect(formatDate1(new Date(2026, 5, 1))).toBe("06月01日");
  });
});

describe("formatDate2", () => {
  it("subtracts one day from the input (used for inclusive end date)", () => {
    expect(formatDate2(new Date(2026, 0, 5))).toBe("01月04日");
  });

  it("handles single-digit months", () => {
    expect(formatDate2(new Date(2026, 5, 10))).toBe("06月09日");
  });
});

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
