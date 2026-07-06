import { describe, it, expect } from "vitest";
import { buildMonthWeeks, type CalendarBarEvent } from "./build-month-weeks";
import { buildMonthMatrix } from "./date-grid";

const DAY = 86_400_000;
const idxOf = (y: number, m0: number, d: number) => Math.floor(Date.UTC(y, m0, d) / DAY);

const NOW = new Date("2024-12-11T03:00:00.000Z");
const matrix = buildMonthMatrix(2024, 11, NOW); // 2024/12, 5週, 日曜始まり

describe("buildMonthWeeks", () => {
  it("週をまたぐイベントは両方の週にバーを生成する", () => {
    // 12/6(金)〜12/9(月) は 第1週(1-7) と 第2週(8-14) にまたがる
    const events: CalendarBarEvent[] = [
      { key: 1, startIdx: idxOf(2024, 11, 6), endIdx: idxOf(2024, 11, 9), color: "#111", label: "A" },
    ];
    const weeks = buildMonthWeeks(events, matrix);
    expect(weeks[0].bars).toHaveLength(1); // 6,7
    expect(weeks[1].bars).toHaveLength(1); // 8,9

    // 第1週: 金(col5)〜土(col6)
    expect(weeks[0].bars[0].startCol).toBe(5);
    expect(weeks[0].bars[0].endCol).toBe(6);
    // 第2週: 日(col0)〜月(col1)
    expect(weeks[1].bars[0].startCol).toBe(0);
    expect(weeks[1].bars[0].endCol).toBe(1);
  });

  it("単日イベントの left/width が1セル分になる", () => {
    const events: CalendarBarEvent[] = [
      { key: 1, startIdx: idxOf(2024, 11, 11), endIdx: idxOf(2024, 11, 11), color: "#111", label: "A" },
    ];
    const weeks = buildMonthWeeks(events, matrix, { gapPct: 0 });
    // 12/11 は第2週の水曜(col3)
    const bar = weeks[1].bars[0];
    expect(bar.startCol).toBe(3);
    expect(bar.leftPct).toBeCloseTo((3 / 7) * 100, 5);
    expect(bar.widthPct).toBeCloseTo((1 / 7) * 100, 5);
  });

  it("重なるイベントでレーンが増え、週の高さが伸びる", () => {
    const events: CalendarBarEvent[] = [
      { key: 1, startIdx: idxOf(2024, 11, 8), endIdx: idxOf(2024, 11, 12), color: "#111", label: "A" },
      { key: 2, startIdx: idxOf(2024, 11, 9), endIdx: idxOf(2024, 11, 13), color: "#222", label: "B" },
    ];
    const weeks = buildMonthWeeks(events, matrix, { headH: 20, laneH: 20, minH: 40, bottomPad: 4 });
    const wk2 = weeks[1];
    expect(wk2.bars).toHaveLength(2);
    const lanes = wk2.bars.map((b) => b.lane).sort();
    expect(lanes).toEqual([0, 1]);
    // 高さ = headH(20) + 2レーン*20 + bottomPad(4) = 64
    expect(wk2.height).toBe(64);
    // 2本目のバーは top = 20 + 1*20 = 40
    const laneTwo = wk2.bars.find((b) => b.lane === 1)!;
    expect(laneTwo.top).toBe(40);
  });

  it("イベントが無い週は最小高さ", () => {
    const weeks = buildMonthWeeks([], matrix, { minH: 64 });
    expect(weeks.every((w) => w.height === 64)).toBe(true);
    expect(weeks.every((w) => w.bars.length === 0)).toBe(true);
  });

  it("data ペイロードをバーに引き継ぐ", () => {
    const events: CalendarBarEvent<{ who: string }>[] = [
      { key: 1, startIdx: idxOf(2024, 11, 11), endIdx: idxOf(2024, 11, 11), color: "#111", label: "A", data: { who: "蒼" } },
    ];
    const weeks = buildMonthWeeks(events, matrix);
    expect(weeks[1].bars[0].data).toEqual({ who: "蒼" });
  });
});

describe("buildMonthWeeks: maxLanes（レーン上限）", () => {
  const matrix = buildMonthMatrix(2024, 11); // 2024年12月
  const idx = (d: number) => idxOf(2024, 11, d);

  // 12/9(月)〜12/13(金) に同日重なりのイベントを5本
  const five = (): CalendarBarEvent[] =>
    Array.from({ length: 5 }, (_, i) => ({
      key: i + 1,
      startIdx: idx(9),
      endIdx: idx(13),
      color: "#111",
      label: `E${i + 1}`,
    }));

  it("上限を超えたバーは隠れ、hiddenByCol に曜日ごとの件数が入る", () => {
    const weeks = buildMonthWeeks(five(), matrix, {
      headH: 20, laneH: 20, minH: 40, bottomPad: 4, maxLanes: 3, moreH: 16,
    });
    const wk2 = weeks[1];
    expect(wk2.bars).toHaveLength(3); // 3レーンまで表示
    expect(wk2.bars.every((b) => b.lane < 3)).toBe(true);
    // 12/9(月)=col1 〜 12/13(金)=col5 に 2件ずつ隠れる
    expect(wk2.hiddenByCol).toEqual([0, 2, 2, 2, 2, 2, 0]);
    // 高さ = headH(20) + 3レーン*20 + moreH(16) + bottomPad(4) = 100（レーン数で無限に伸びない）
    expect(wk2.height).toBe(100);
  });

  it("上限未指定なら全バー表示で hiddenByCol は全て 0", () => {
    const weeks = buildMonthWeeks(five(), matrix, { headH: 20, laneH: 20, minH: 40, bottomPad: 4 });
    const wk2 = weeks[1];
    expect(wk2.bars).toHaveLength(5);
    expect(wk2.hiddenByCol).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(wk2.height).toBe(20 + 5 * 20 + 4);
  });

  it("隠れバーが無い週には moreH を加算しない", () => {
    const weeks = buildMonthWeeks(five().slice(0, 2), matrix, {
      headH: 20, laneH: 20, minH: 40, bottomPad: 4, maxLanes: 3, moreH: 16,
    });
    expect(weeks[1].height).toBe(20 + 2 * 20 + 4);
  });
});
