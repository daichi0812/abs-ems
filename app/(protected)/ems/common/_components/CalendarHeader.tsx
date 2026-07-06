import { cn } from "@/lib/utils";
import { formatRange } from "@/lib/calendar/date-grid";
import { type View } from "@/app/(protected)/ems/common/hooks/use-calendar-view-state";

interface CalendarHeaderProps {
  view: View;
  onSelectView: (v: View) => void;
  isCurrentMonth: boolean;
  monthLabel: string;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  ganttWeekOffset: number;
  ganttWindowStart: number;
  ganttWindowEnd: number;
  goGanttToday: () => void;
  goGanttPrev: () => void;
  goGanttNext: () => void;
}

export function CalendarHeader({
  view,
  onSelectView,
  isCurrentMonth,
  monthLabel,
  goToday,
  goPrevMonth,
  goNextMonth,
  ganttWeekOffset,
  ganttWindowStart,
  ganttWindowEnd,
  goGanttToday,
  goGanttPrev,
  goGanttNext,
}: CalendarHeaderProps) {
  return (
    // ビュー切替 + 月ラベル
    <div className="mb-3 flex items-center gap-3">
      <div className="flex w-[180px] rounded-xl bg-[#E9EDF1] p-[3px]">
        {(["month", "gantt"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelectView(v)}
            className={cn(
              "h-8 flex-1 rounded-[9px] text-xs font-bold transition-colors",
              view === v ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            )}
          >
            {v === "month" ? "月表示" : "機材ガント"}
          </button>
        ))}
      </div>
      {view === "gantt" && (
        <div className="ml-auto flex items-center gap-1">
          {ganttWeekOffset !== 0 && (
            <button
              type="button"
              onClick={goGanttToday}
              className="flex h-8 items-center rounded-lg px-2.5 text-xs font-bold text-brand hover:bg-line-soft"
            >
              今日
            </button>
          )}
          <button
            type="button"
            onClick={goGanttPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
            aria-label="前の週"
          >
            ‹
          </button>
          <span className="min-w-[104px] text-center text-xs font-black">
            {formatRange(ganttWindowStart, ganttWindowEnd)}
          </span>
          <button
            type="button"
            onClick={goGanttNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
            aria-label="次の週"
          >
            ›
          </button>
        </div>
      )}
      {view === "month" && (
        <div className="ml-auto flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              className="flex h-8 items-center rounded-lg px-2.5 text-xs font-bold text-brand hover:bg-line-soft"
            >
              今日
            </button>
          )}
          <button
            type="button"
            onClick={goPrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
            aria-label="前の月"
          >
            ‹
          </button>
          <span className="min-w-[92px] text-center text-sm font-black">{monthLabel}</span>
          <button
            type="button"
            onClick={goNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
            aria-label="次の月"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
