import { describe, it, expect } from "vitest";
import { memberColor, memberInitial } from "./member-colors";

describe("memberColor", () => {
  it("同じ名前は常に同じ色（決定的）", () => {
    expect(memberColor("川崎蒼汰")).toBe(memberColor("川崎蒼汰"));
  });

  it("常に #RRGGBB を返す", () => {
    for (const name of ["川崎蒼汰", "星野琉生", "三浦ひな", "大森悠人"]) {
      expect(memberColor(name)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("空/undefined はフォールバック色", () => {
    expect(memberColor(undefined)).toBe("#667085");
    expect(memberColor("")).toBe("#667085");
  });
});

describe("memberInitial", () => {
  it("先頭1文字", () => {
    expect(memberInitial("川崎蒼汰")).toBe("川");
    expect(memberInitial(" 星野")).toBe("星");
  });
  it("空はプレースホルダ", () => {
    expect(memberInitial(undefined)).toBe("?");
    expect(memberInitial("")).toBe("?");
  });
});
