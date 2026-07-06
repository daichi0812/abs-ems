import { describe, expect, it } from "vitest";
import { compressImage } from "./image-compress";

// jsdom には createImageBitmap / canvas が無いため、ここでは fail-open の
// スキップ経路（原本をそのまま返す契約）を固定する。実際の縮小はブラウザでのみ動く。
describe("compressImage", () => {
  it("画像以外のファイルはそのまま返す", async () => {
    const file = new File(["abc"], "list.csv", { type: "text/csv" });
    expect(await compressImage(file)).toBe(file);
  });

  it("GIF / SVG は変換で壊れるためそのまま返す", async () => {
    const gif = new File([new Uint8Array(400 * 1024)], "a.gif", { type: "image/gif" });
    const svg = new File([new Uint8Array(400 * 1024)], "a.svg", { type: "image/svg+xml" });
    expect(await compressImage(gif)).toBe(gif);
    expect(await compressImage(svg)).toBe(svg);
  });

  it("しきい値以下の軽い画像はそのまま返す", async () => {
    const small = new File([new Uint8Array(100 * 1024)], "small.png", { type: "image/png" });
    expect(await compressImage(small)).toBe(small);
  });

  it("createImageBitmap が無い環境では原本を返す（fail-open）", async () => {
    // jsdom には createImageBitmap が無い。この経路でアップロードが止まらないことが契約
    const big = new File([new Uint8Array(4 * 1024 * 1024)], "photo.png", { type: "image/png" });
    expect(await compressImage(big)).toBe(big);
  });
});
