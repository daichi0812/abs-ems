"use client";

import { cn } from "@/lib/utils";
import { dayIndexToUtcDate, DOW_LABELS } from "@/lib/calendar/date-grid";

export interface GanttBar<T = unknown> {
  key: string | number;
  startIdx: number; // inclusive
  endIdx: number; // inclusive
  color: string;
  initial?: string;
  label?: string;
  data?: T;
}

export interface GanttRow<T = unknown> {
  key: string | number;
  name: string;
  categoryColor: string;
  categoryName?: string;
  bars: GanttBar<T>[];
}

// 機材ガント（機材×日）。windowStartIdx から dayCount 日ぶんの窓を横軸に、
// 各機材行に予約バーを部員色で置く。今日の列をハイライトする。
export interface EquipmentGanttProps<T> {
  windowStartIdx: number;
  dayCount: number;
  todayIdx: number;
  rows: GanttRow<T>[];
  onBarClick?: (bar: GanttBar<T>, row: GanttRow<T>) => void;
  labelWidth?: number; // 左の機材名列の幅(px)
  className?: string;
}

export function EquipmentGantt<T = unknown>({
  windowStartIdx,
  dayCount,
  todayIdx,
  rows,
  onBarClick,
  labelWidth = 96,
  className,
}: EquipmentGanttProps<T>) {
  const winEnd = windowStartIdx + dayCount - 1;
  const colPct = 100 / dayCount;

  const days = Array.from({ length: dayCount }, (_, i) => {
    const dayIndex = windowStartIdx + i;
    const d = dayIndexToUtcDate(dayIndex);
    return {
      dayIndex,
      dayOfMonth: d.getUTCDate(),
      dow: DOW_LABELS[(((dayIndex + 4) % 7) + 7) % 7],
      isToday: dayIndex === todayIdx,
    };
  });

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div style={{ minWidth: labelWidth + dayCount * 40 }}>
        {/* 日付ヘッダー */}
        <div className="flex border-b border-line bg-[#FBFCFD]">
          <div
            className="sticky left-0 z-[2] flex-none border-r border-line bg-[#FBFCFD]"
            style={{ width: labelWidth }}
          />
          {days.map((d) => (
            <div
              key={d.dayIndex}
              className="flex-1 py-[5px] text-center"
              style={{ background: d.isToday ? "#EAF3FE" : "transparent" }}
            >
              <p className={cn("m-0 text-[8px]", d.isToday ? "text-brand-dark" : "text-ink-faint")}>
                {d.dow}
              </p>
              <p className={cn("m-0 text-[11.5px] font-bold", d.isToday ? "text-brand-dark" : "text-ink")}>
                {d.dayOfMonth}
              </p>
            </div>
          ))}
        </div>

        {/* 機材行 */}
        {rows.map((row) => (
          <div key={row.key} className="flex border-b border-line/60 bg-white">
            <div
              className="sticky left-0 z-[2] flex flex-none flex-col justify-center border-r border-line bg-white px-2"
              style={{ width: labelWidth, height: 40 }}
            >
              <span className="truncate text-[10px] font-bold">{row.name}</span>
              {row.categoryName && (
                <span className="flex items-center gap-1 text-[8px] text-ink-faint">
                  <span
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ background: row.categoryColor }}
                  />
                  {row.categoryName}
                </span>
              )}
            </div>
            <div className="relative flex-1" style={{ height: 40 }}>
              {/* 今日カラムの縦帯 */}
              {todayIdx >= windowStartIdx && todayIdx <= winEnd && (
                <div
                  className="absolute bottom-0 top-0"
                  style={{
                    left: `${(todayIdx - windowStartIdx) * colPct}%`,
                    width: `${colPct}%`,
                    background: "rgba(46,144,250,.07)",
                    borderLeft: "1.5px dashed rgba(46,144,250,.4)",
                  }}
                />
              )}
              {row.bars.map((bar) => {
                const cs = Math.max(bar.startIdx, windowStartIdx);
                const ce = Math.min(bar.endIdx, winEnd);
                if (ce < cs) return null;
                return (
                  <button
                    key={bar.key}
                    type="button"
                    onClick={() => onBarClick?.(bar, row)}
                    className="absolute flex items-center gap-1 overflow-hidden rounded-full px-[3px]"
                    style={{
                      top: 8,
                      height: 24,
                      left: `${(cs - windowStartIdx) * colPct}%`,
                      width: `${(ce - cs + 1) * colPct}%`,
                      background: bar.color,
                    }}
                  >
                    {bar.initial && (
                      <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-white/30 text-[9px] font-bold text-white">
                        {bar.initial}
                      </span>
                    )}
                    {bar.label && (
                      <span className="truncate text-[9px] font-bold text-white">{bar.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
