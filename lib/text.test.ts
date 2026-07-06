import { describe, it, expect } from "vitest";
import { flattenNewlines } from "./text";

describe("flattenNewlines", () => {
  it("実際の改行を空白1つに畳む", () => {
    expect(flattenNewlines("1行目\n2行目\r\n3行目")).toBe("1行目 2行目 3行目");
  });

  it("文字どおりの「\\n」(バックスラッシュ+n)も畳む", () => {
    expect(flattenNewlines("apture 600dです\\n色温度はいじれません")).toBe(
      "apture 600dです 色温度はいじれません"
    );
  });

  it("連続する改行は空白1つにまとめ、端の改行は取り除く", () => {
    expect(flattenNewlines("小型照明3つがセットです\\n\\n2800K-6500K")).toBe(
      "小型照明3つがセットです 2800K-6500K"
    );
    expect(flattenNewlines("NANLITE FS-300Bです。\\n")).toBe("NANLITE FS-300Bです。");
  });

  it("「\\n」以外のバックスラッシュ列はそのまま残す", () => {
    expect(flattenNewlines("Vマウントバッテリーです\\99のやつです")).toBe(
      "Vマウントバッテリーです\\99のやつです"
    );
  });
});
