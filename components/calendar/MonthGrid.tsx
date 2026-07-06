"use client";

import { cn } from "@/lib/utils";
import { DOW_LABELS } from "@/lib/calendar/date-grid";
import type { PositionedBar, WeekRow } from "@/lib/calendar/build-month-weeks";

// 月表示カレンダー（プレゼンテーション）。配置済みの週データ（buildMonthWeeks の結果）を
// 受け取り、曜日ヘッダー + 週行 + 絶対配置バーを描画する。データ整形は呼び出し側の責務。
export interface MonthGridProps<T> {
  weeks: WeekRow<T>[];
  onBarClick?: (bar: PositionedBar<T>) => void;
  selectedKey?: string | number | null;
  isDimmed?: (bar: PositionedBar<T>) => boolean;
  className?: string;
  /** バーの高さ(px)。buildMonthWeeks の laneH と揃えて調整する（既定18） */
  barHeight?: number;
}

export function MonthGrid<T = unknown>({
  weeks,
  onBarClick,
  selectedKey,
  isDimmed,
  className,
  barHeight = 18,
}: MonthGridProps<T>) {
  return (
    <div className={className}>
      <div className="mb-1 grid grid-cols-7">
        {DOW_LABELS.map((d) => (
          <span key={d} className="text-center text-[10px] text-ink-faint md:text-[11.5px]">
            {d}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="relative border-b border-line last:border-b-0"
            style={{ height: week.height }}
          >
            <div className="grid h-full grid-cols-7">
              {week.days.map((day) => (
                <div
                  key={day.dayIndex}
                  className={cn(
                    "relative border-r border-line/60 pt-[3px] text-center text-[10px] last:border-r-0 md:pt-1.5 md:text-[11.5px]",
                    !day.inMonth && "text-line-strong",
                    day.inMonth && !day.isToday && "text-ink-muted",
                    day.isToday && "font-bold text-brand"
                  )}
                  style={day.isToday ? { background: "#EAF3FE" } : undefined}
                >
                  {day.dayOfMonth}
                </div>
              ))}
            </div>
            {week.bars.map((bar) => {
              const dimmed = isDimmed?.(bar) ?? false;
              const selected = selectedKey != null && bar.key === selectedKey;
              return (
                <button
                  key={bar.key}
                  type="button"
                  onClick={() => onBarClick?.(bar)}
                  // before はタップ領域の拡張（見た目は変えずレーン間隔ぶんまで当たり判定を広げる）
                  className="absolute flex items-center rounded-[5px] px-1.5 text-left transition-opacity before:absolute before:inset-x-0 before:-inset-y-[2px] before:content-['']"
                  style={{
                    left: `${bar.leftPct}%`,
                    width: `${bar.widthPct}%`,
                    top: bar.top,
                    height: barHeight,
                    background: bar.color,
                    opacity: dimmed ? 0.16 : 1,
                    outline: selected ? "2px solid #101828" : "none",
                  }}
                >
                  {/* 親の overflow-hidden はタップ領域拡張(before)を切ってしまうため、
                      はみ出し制御はラベル側の min-w-0 + truncate で行う */}
                  <span className="min-w-0 flex-1 truncate text-[8.5px] font-bold text-white md:text-[10.5px]">
                    {bar.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
