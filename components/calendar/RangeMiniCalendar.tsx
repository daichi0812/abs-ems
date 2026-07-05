"use client";

import { cn } from "@/lib/utils";
import { DOW_LABELS, buildMonthMatrix, todayJstDayIndex } from "@/lib/calendar/date-grid";

export interface DayRange {
  startIdx: number | null;
  endIdx: number | null;
}

// 期間（開始〜終了）をタップで選ぶミニカレンダー。予約ウィザードの Step1 で使う。
// 過去日と対象月外はタップ不可。開始のみ選択中はその日をエッジ表示、終了選択で範囲塗り。
export interface RangeMiniCalendarProps {
  year: number;
  month0: number;
  value: DayRange;
  onChange: (next: DayRange) => void;
  now?: Date | number;
  className?: string;
}

export function RangeMiniCalendar({
  year,
  month0,
  value,
  onChange,
  now = new Date(),
  className,
}: RangeMiniCalendarProps) {
  const matrix = buildMonthMatrix(year, month0, now);
  const todayIdx = todayJstDayIndex(now);
  const { startIdx, endIdx } = value;

  const handleClick = (dayIndex: number) => {
    // 開始未選択 / 既に両端確定 / 開始より前をタップ → 新しい開始として選び直す
    if (startIdx == null || (startIdx != null && endIdx != null) || dayIndex < startIdx) {
      onChange({ startIdx: dayIndex, endIdx: null });
    } else {
      onChange({ startIdx, endIdx: dayIndex });
    }
  };

  return (
    <div className={className}>
      <div className="mb-1 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <span key={d} className="text-center text-[10px] text-ink-faint">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-[2px]">
        {matrix.weeks.flat().map((day) => {
          const disabled = !day.inMonth || day.dayIndex < todayIdx;
          const isEdge = day.dayIndex === startIdx || day.dayIndex === endIdx;
          const inRange =
            startIdx != null &&
            endIdx != null &&
            day.dayIndex >= startIdx &&
            day.dayIndex <= endIdx;
          return (
            <button
              key={day.dayIndex}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(day.dayIndex)}
              className={cn(
                "flex h-[42px] items-center justify-center text-sm transition-colors",
                isEdge && "rounded-full font-bold text-white",
                !isEdge && inRange && "text-ink",
                !isEdge && !inRange && !disabled && "rounded-full text-ink hover:bg-line-soft",
                disabled && !day.inMonth && "text-line",
                disabled && day.inMonth && "cursor-default text-line-strong"
              )}
              style={{
                background: isEdge ? "#2E90FA" : inRange ? "#EAF3FE" : undefined,
                borderRadius: isEdge ? 999 : inRange ? 0 : undefined,
                cursor: disabled ? "default" : "pointer",
              }}
            >
              {day.dayOfMonth}
            </button>
          );
        })}
      </div>
    </div>
  );
}
