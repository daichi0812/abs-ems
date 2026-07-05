// カレンダーの日付グリッド生成（純関数）。
//
// このアプリの予約日付は「JST の暦日を UTC 00:00 として保存」する運用
// （app/api/reserves/route.ts の正規化）。そこで日付は "JST day index"
// ＝ 1970-01-01(JST) からの通日 で扱うと、保存値・今日・グリッドが一貫して比較できる。
//
// - reserve の start/end（UTC 00:00）→ getTime()/DAY がそのまま day index
// - 実時刻の now → (getTime()+9h)/DAY を floor すると JST 暦日の index

const MS_PER_DAY = 86_400_000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 任意の日時を JST 暦日の通日インデックスに変換する。 */
export function toJstDayIndex(date: Date | string | number): number {
  const t = new Date(date).getTime();
  return Math.floor((t + JST_OFFSET_MS) / MS_PER_DAY);
}

/** day index → その JST 暦日を表す UTC 00:00 の Date。ラベル抽出に使う。 */
export function dayIndexToUtcDate(dayIndex: number): Date {
  return new Date(dayIndex * MS_PER_DAY);
}

/** 曜日番号（0=日 … 6=土）。1970-01-01 は木曜(4)。 */
export function dowOfDayIndex(dayIndex: number): number {
  return (((dayIndex + 4) % 7) + 7) % 7;
}

/** 現在の JST 暦日の day index。テスト用に now を注入できる。 */
export function todayJstDayIndex(now: Date | number = new Date()): number {
  return toJstDayIndex(now);
}

export const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export interface DayCell {
  dayIndex: number;
  dayOfMonth: number; // 1..31
  inMonth: boolean; // 対象月内か（前後月の埋め草は false）
  isToday: boolean;
  dow: number; // 0=日 .. 6=土
}

export interface MonthMatrix {
  year: number;
  month0: number; // 0-indexed 月
  monthLabel: string; // "2024年12月"
  firstDayIndex: number; // 月初の day index
  lastDayIndex: number; // 月末の day index
  weeks: DayCell[][]; // 各 7 セル、日曜始まり
}

/**
 * 指定した年・月（month0 は 0-indexed）の月グリッドを生成する。
 * 日曜始まりで、前後の月の埋め草セルを含む（4〜6 週）。
 */
export function buildMonthMatrix(
  year: number,
  month0: number,
  now: Date | number = new Date()
): MonthMatrix {
  const firstDayIndex = Math.floor(Date.UTC(year, month0, 1) / MS_PER_DAY);
  const lastDayIndex = Math.floor(Date.UTC(year, month0 + 1, 0) / MS_PER_DAY);
  const todayIdx = todayJstDayIndex(now);

  const gridStart = firstDayIndex - dowOfDayIndex(firstDayIndex);
  const gridEnd = lastDayIndex + (6 - dowOfDayIndex(lastDayIndex));

  const weeks: DayCell[][] = [];
  for (let idx = gridStart; idx <= gridEnd; idx += 7) {
    const week: DayCell[] = [];
    for (let c = 0; c < 7; c++) {
      const dayIndex = idx + c;
      const d = dayIndexToUtcDate(dayIndex);
      week.push({
        dayIndex,
        dayOfMonth: d.getUTCDate(),
        inMonth: dayIndex >= firstDayIndex && dayIndex <= lastDayIndex,
        isToday: dayIndex === todayIdx,
        dow: dowOfDayIndex(dayIndex),
      });
    }
    weeks.push(week);
  }

  return {
    year,
    month0,
    monthLabel: `${year}年${month0 + 1}月`,
    firstDayIndex,
    lastDayIndex,
    weeks,
  };
}

/** day index を「M/D」表記にする（バー詳細などの短い表示用）。 */
export function formatDayIndexShort(dayIndex: number): string {
  const d = dayIndexToUtcDate(dayIndex);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** day index を API 送信用の "YYYY-MM-DD"（JST 暦日）に変換する。 */
export function dayIndexToDateString(dayIndex: number): string {
  const d = dayIndexToUtcDate(dayIndex);
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 期間（inclusive）を「M/D」または「M/D〜M/D」にする。 */
export function formatRange(startIdx: number, endIdx: number): string {
  return startIdx === endIdx
    ? formatDayIndexShort(startIdx)
    : `${formatDayIndexShort(startIdx)}〜${formatDayIndexShort(endIdx)}`;
}
