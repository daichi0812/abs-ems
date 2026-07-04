import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("supports conditional classes via objects", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });

  it("dedupes conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("preserves non-conflicting Tailwind classes", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("returns empty string when no inputs", () => {
    expect(cn()).toBe("");
  });
});
