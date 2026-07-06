import { describe, it, expect } from "vitest";
import { memberColor, memberColorMap, memberInitial } from "./member-colors";

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

describe("memberColorMap", () => {
  it("パレット数以内なら全員に異なる色を割り当てる（ハッシュ衝突を回避する）", () => {
    // 素の memberColor では衝突することが分かっている組を含む名前群
    const names = [
      "川崎蒼汰",
      "大森悠人",
      "星野琉生",
      "三浦ひな",
      "青山太郎",
      "佐藤花子",
      "田中一郎",
      "鈴木次郎",
    ];
    const map = memberColorMap(names);
    const colors = [...map.values()];
    expect(new Set(colors).size).toBe(names.length);
  });

  it("同じメンバー集合なら並び順に関係なく同じ割り当て（安定）", () => {
    const a = memberColorMap(["川崎蒼汰", "星野琉生", "三浦ひな"]);
    const b = memberColorMap(["三浦ひな", "川崎蒼汰", "星野琉生"]);
    expect(Object.fromEntries(a)).toEqual(Object.fromEntries(b));
  });

  it("null/undefined/重複は無視する", () => {
    const map = memberColorMap(["川崎蒼汰", null, undefined, "川崎蒼汰"]);
    expect(map.size).toBe(1);
  });

  it("パレット数を超えても例外にならない（重複はやむなし）", () => {
    const names = Array.from({ length: 30 }, (_, i) => `部員${i}`);
    const map = memberColorMap(names);
    expect(map.size).toBe(30);
    for (const color of map.values()) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("優先リスト（表示中の月の部員）は履歴が何人いても互いに異なる色になる", () => {
    // 卒業生など履歴上の名前が一意枠(16色)を食いつぶしても、
    // いま表示している月の部員同士は同色にならないことを固定する
    const history = Array.from({ length: 30 }, (_, i) => `卒業生${i}`);
    const current = ["現役A", "現役B", "現役C", "現役D"];
    const map = memberColorMap([...history, ...current], current);
    const currentColors = current.map((n) => map.get(n));
    expect(new Set(currentColors).size).toBe(current.length);
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
