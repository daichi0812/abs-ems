// 月グリッド + イベントを「週ごとの配置済みバー」に変換する（純関数）。
// UI刷新案の buildMyWeeks を一般化。MonthGrid / マイ予約カレンダーの両方から使う。
// バーは省略せず全件配置し、週の高さはレーン数に応じて伸びる
// （以前は maxLanes で「+N件」に丸めていたが、全件見える方を優先する判断に変更）。

import type { DayCell, MonthMatrix } from "./date-grid";
import { clipToWeek, packLanes } from "./lane-packing";

export interface CalendarBarEvent<T = unknown> {
  key: string | number;
  startIdx: number; // inclusive な JST day index
  endIdx: number; // inclusive
  color: string;
  label: string;
  data?: T;
}

export interface PositionedBar<T = unknown> {
  key: string | number;
  leftPct: number;
  widthPct: number;
  top: number; // px
  lane: number;
  color: string;
  label: string;
  startCol: number;
  endCol: number;
  data?: T;
}

export interface WeekRow<T = unknown> {
  days: DayCell[];
  height: number; // px
  bars: PositionedBar<T>[];
}

export interface BuildOptions {
  headH?: number; // 日付数字の領域高さ（px）
  laneH?: number; // 1 レーンの高さ（px）
  minH?: number; // 週の最小高さ（px）
  bottomPad?: number; // 最終レーン下の余白（px）
  gapPct?: number; // バー左右の隙間（%・セル幅比）
}

const DEFAULTS = {
  headH: 22,
  laneH: 22,
  minH: 64,
  bottomPad: 4,
  gapPct: 1.2,
} satisfies Required<BuildOptions>;

/**
 * events（inclusive な day index 区間）を matrix の各週に配置する。
 * 週ごとにイベントをクリップ → レーン詰め → % 位置と top(px) を計算する。
 */
export function buildMonthWeeks<T = unknown>(
  events: CalendarBarEvent<T>[],
  matrix: MonthMatrix,
  options: BuildOptions = {}
): WeekRow<T>[] {
  const opt = { ...DEFAULTS, ...options };

  return matrix.weeks.map((days) => {
    const weekStartIdx = days[0].dayIndex;

    // この週に掛かるイベントを列にクリップ
    const segments = events
      .map((ev) => {
        const clip = clipToWeek(ev.startIdx, ev.endIdx, weekStartIdx);
        return clip ? { ...clip, ev } : null;
      })
      .filter((x): x is { startCol: number; endCol: number; ev: CalendarBarEvent<T> } => x !== null);

    const { laneCount, laned } = packLanes(segments);

    const bars: PositionedBar<T>[] = laned.map((seg) => {
      const spanCols = seg.endCol - seg.startCol + 1;
      return {
        key: seg.ev.key,
        leftPct: (seg.startCol / 7) * 100 + opt.gapPct / 2,
        widthPct: (spanCols / 7) * 100 - opt.gapPct,
        top: opt.headH + seg.lane * opt.laneH,
        lane: seg.lane,
        color: seg.ev.color,
        label: seg.ev.label,
        startCol: seg.startCol,
        endCol: seg.endCol,
        data: seg.ev.data,
      };
    });

    const height = Math.max(opt.minH, opt.headH + laneCount * opt.laneH + opt.bottomPad);
    return { days, height, bars };
  });
}
