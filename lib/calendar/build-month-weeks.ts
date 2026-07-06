// 月グリッド + イベントを「週ごとの配置済みバー」に変換する（純関数）。
// UI刷新案の buildMyWeeks を一般化。MonthGrid / マイ予約カレンダーの両方から使う。

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
  /** maxLanes 超過で隠れたバーの数（曜日列ごと。上限なしなら全て 0） */
  hiddenByCol: number[];
}

export interface BuildOptions {
  headH?: number; // 日付数字の領域高さ（px）
  laneH?: number; // 1 レーンの高さ（px）
  minH?: number; // 週の最小高さ（px）
  bottomPad?: number; // 最終レーン下の余白（px）
  gapPct?: number; // バー左右の隙間（%・セル幅比）
  /**
   * 週あたりの表示レーン数の上限。超えたバーは非表示にし hiddenByCol に集計する
   * （実データでは1週に20件以上重なることがあり、無制限だと行高が数百pxに膨らむ）。
   * 未指定なら無制限。
   */
  maxLanes?: number;
  /** hiddenByCol の「+N」表示行のための追加高さ（px）。隠れバーがある週にだけ加算 */
  moreH?: number;
}

const DEFAULTS = {
  headH: 22,
  laneH: 22,
  minH: 64,
  bottomPad: 4,
  gapPct: 1.2,
  maxLanes: Infinity,
  moreH: 16,
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

    // 上限超過レーンのバーは隠し、曜日列ごとに件数を集計する
    const hiddenByCol = Array.from({ length: 7 }, () => 0);
    const visible = laned.filter((seg) => {
      if (seg.lane < opt.maxLanes) return true;
      for (let col = seg.startCol; col <= seg.endCol; col++) {
        hiddenByCol[col] += 1;
      }
      return false;
    });

    const bars: PositionedBar<T>[] = visible.map((seg) => {
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

    const shownLanes = Math.min(laneCount, opt.maxLanes);
    const hasHidden = hiddenByCol.some((n) => n > 0);
    const height = Math.max(
      opt.minH,
      opt.headH + shownLanes * opt.laneH + (hasHidden ? opt.moreH : 0) + opt.bottomPad
    );
    return { days, height, bars, hiddenByCol };
  });
}
