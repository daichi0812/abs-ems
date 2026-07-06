import { describe, it, expect } from "vitest";
import { daysLeftLabel } from "./reservation-labels";

const DAY = 86_400_000;
const idxOf = (y: number, m0: number, d: number) => Math.floor(Date.UTC(y, m0, d) / DAY);
const today = idxOf(2024, 11, 11);

describe("daysLeftLabel", () => {
  it("開始前は開始予定日", () => {
    expect(daysLeftLabel(idxOf(2024, 11, 14), idxOf(2024, 11, 16), today)).toBe("12/14開始予定");
  });
  it("期限切れ", () => {
    expect(daysLeftLabel(idxOf(2024, 11, 5), idxOf(2024, 11, 9), today)).toBe("期限超過");
  });
  it("今日返却", () => {
    expect(daysLeftLabel(idxOf(2024, 11, 8), today, today)).toBe("今日返却");
  });
  it("残り日数", () => {
    expect(daysLeftLabel(idxOf(2024, 11, 10), idxOf(2024, 11, 13), today)).toBe("あと2日");
  });
});
