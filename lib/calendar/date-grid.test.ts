import { describe, it, expect } from "vitest";
import {
  toJstDayIndex,
  dowOfDayIndex,
  buildMonthMatrix,
  formatRange,
  formatDayIndexShort,
} from "./date-grid";

const DAY = 86_400_000;
const idxOf = (y: number, m0: number, d: number) => Math.floor(Date.UTC(y, m0, d) / DAY);

describe("toJstDayIndex", () => {
  it("UTC 00:00 保存の予約日をその JST 暦日の index に写像する", () => {
    // 2024-12-11 (JST) は UTC 00:00 で保存される
    expect(toJstDayIndex("2024-12-11T00:00:00.000Z")).toBe(idxOf(2024, 11, 11));
  });

  it("JST 正午の実時刻も同じ暦日になる", () => {
    // JST 12/11 12:00 = UTC 12/11 03:00
    expect(toJstDayIndex("2024-12-11T03:00:00.000Z")).toBe(idxOf(2024, 11, 11));
  });

  it("UTC では前日でも JST 深夜なら翌日側に寄る", () => {
    // JST 12/11 00:30 = UTC 12/10 15:30 → JST では 12/11
    expect(toJstDayIndex("2024-12-10T15:30:00.000Z")).toBe(idxOf(2024, 11, 11));
  });
});

describe("dowOfDayIndex", () => {
  it("1970-01-01 は木曜(4)", () => {
    expect(dowOfDayIndex(0)).toBe(4);
  });
  it("2024-12-01 は日曜(0)", () => {
    expect(dowOfDayIndex(idxOf(2024, 11, 1))).toBe(0);
  });
});

describe("buildMonthMatrix", () => {
  const now = new Date("2024-12-11T03:00:00.000Z"); // JST 12/11 正午
  const m = buildMonthMatrix(2024, 11, now);

  it("ラベルと月境界", () => {
    expect(m.monthLabel).toBe("2024年12月");
    expect(m.firstDayIndex).toBe(idxOf(2024, 11, 1));
    expect(m.lastDayIndex).toBe(idxOf(2024, 11, 31));
  });

  it("日曜始まり・12月は5週", () => {
    expect(m.weeks).toHaveLength(5);
    expect(m.weeks[0][0].dow).toBe(0);
    expect(m.weeks[0][0].dayOfMonth).toBe(1);
    expect(m.weeks[0][0].inMonth).toBe(true);
  });

  it("翌月の埋め草セルは inMonth=false", () => {
    const lastWeek = m.weeks[4];
    const jan1 = lastWeek.find((c) => c.dayOfMonth === 1 && !c.inMonth);
    expect(jan1).toBeTruthy();
  });

  it("今日フラグ", () => {
    const flat = m.weeks.flat();
    const today = flat.filter((c) => c.isToday);
    expect(today).toHaveLength(1);
    expect(today[0].dayOfMonth).toBe(11);
    expect(today[0].inMonth).toBe(true);
  });

  it("2月(28日/うるう年でない年)の生成", () => {
    const feb = buildMonthMatrix(2025, 1, new Date("2025-02-10T03:00:00Z"));
    expect(feb.lastDayIndex).toBe(idxOf(2025, 1, 28));
  });
});

describe("formatRange / formatDayIndexShort", () => {
  it("単日と期間", () => {
    const a = idxOf(2024, 11, 11);
    const b = idxOf(2024, 11, 13);
    expect(formatDayIndexShort(a)).toBe("12/11");
    expect(formatRange(a, a)).toBe("12/11");
    expect(formatRange(a, b)).toBe("12/11〜12/13");
  });
});
