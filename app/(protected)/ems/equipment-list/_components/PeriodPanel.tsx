"use client";

import { RangeMiniCalendar, type DayRange } from "@/components/calendar/RangeMiniCalendar";
import { formatRange } from "@/lib/calendar/date-grid";

// 予約ウィザード Step1: 期間選択。単月表示＋前後移動。
export function PeriodPanel({
  year,
  month0,
  monthLabel,
  range,
  onRangeChange,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month0: number;
  monthLabel: string;
  range: DayRange;
  onRangeChange: (r: DayRange) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const days =
    range.startIdx != null && range.endIdx != null ? range.endIdx - range.startIdx + 1 : 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-sm font-black">期間を選ぶ</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
            aria-label="前の月"
          >
            ‹
          </button>
          <span className="min-w-[84px] text-center text-[13px] font-bold">{monthLabel}</span>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
            aria-label="次の月"
          >
            ›
          </button>
        </div>
      </div>

      <RangeMiniCalendar
        year={year}
        month0={month0}
        value={range}
        onChange={onRangeChange}
      />

      <div className="mt-3 rounded-xl bg-brand-faint px-3 py-2.5">
        <p className="m-0 text-[12.5px] font-bold text-ink">
          {range.startIdx == null
            ? "利用したい日をタップ"
            : range.endIdx == null
              ? "返却日をタップ"
              : `${formatRange(range.startIdx, range.endIdx)}（${days}日間）`}
        </p>
      </div>
    </div>
  );
}
