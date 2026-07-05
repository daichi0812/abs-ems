"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useCalendarData,
  type CalendarEvent,
} from "@/app/(protected)/_components/calendar/hooks/common/use-calendar-data";
import {
  buildMonthMatrix,
  toJstDayIndex,
  todayJstDayIndex,
  formatRange,
} from "@/lib/calendar/date-grid";
import { buildMonthWeeks, type CalendarBarEvent } from "@/lib/calendar/build-month-weeks";
import { memberColor, memberInitial } from "@/lib/calendar/member-colors";
import { daysLeftLabel } from "@/lib/calendar/reservation-labels";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { EquipmentGantt, type GanttRow } from "@/components/calendar/EquipmentGantt";
import { MemberChips } from "@/components/calendar/MemberChips";
import { EventDetailPopover } from "@/components/calendar/EventDetailPopover";
import { Skeleton } from "@/components/ui/skeleton";

type View = "month" | "gantt";

// イベントを inclusive な day index 区間へ変換
function eventInterval(ev: CalendarEvent) {
  return { startIdx: toJstDayIndex(ev.start), endIdx: toJstDayIndex(ev.end) };
}

export function CalendarBoard() {
  const { allEvents, isFetching } = useCalendarData();
  const todayIdx = todayJstDayIndex();

  const [view, setView] = useState<View>("month");
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  // 今日を含む月を初期表示。前後移動できる。
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(todayDate.getMonth());

  const members = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => e.name && set.add(e.name));
    return [...set];
  }, [allEvents]);

  const matrix = useMemo(
    () => buildMonthMatrix(viewYear, viewMonth0),
    [viewYear, viewMonth0]
  );

  const barEvents = useMemo<CalendarBarEvent<CalendarEvent>[]>(
    () =>
      allEvents.map((ev) => {
        const { startIdx, endIdx } = eventInterval(ev);
        return {
          key: ev.id,
          startIdx,
          endIdx,
          color: memberColor(ev.name),
          label: ev.title,
          data: ev,
        };
      }),
    [allEvents]
  );

  const weeks = useMemo(
    () => buildMonthWeeks(barEvents, matrix, { headH: 20, laneH: 20, minH: 62 }),
    [barEvents, matrix]
  );

  // ガント: 今日の3日前から14日窓
  const ganttWindowStart = todayIdx - 3;
  const ganttDayCount = 14;
  const ganttRows = useMemo<GanttRow<CalendarEvent>[]>(() => {
    const winEnd = ganttWindowStart + ganttDayCount - 1;
    const byEquip = new Map<string, GanttRow<CalendarEvent>>();
    allEvents.forEach((ev) => {
      const { startIdx, endIdx } = eventInterval(ev);
      if (endIdx < ganttWindowStart || startIdx > winEnd) return;
      let row = byEquip.get(ev.title);
      if (!row) {
        row = {
          key: ev.title,
          name: ev.title,
          categoryColor: ev.backgroundColor ?? "#667085",
          bars: [],
        };
        byEquip.set(ev.title, row);
      }
      row.bars.push({
        key: ev.id,
        startIdx,
        endIdx,
        color: memberColor(ev.name),
        initial: memberInitial(ev.name),
        label: `〜${formatRange(endIdx, endIdx)}`,
        data: ev,
      });
    });
    return [...byEquip.values()];
  }, [allEvents, ganttWindowStart]);

  const selectedEvent = allEvents.find((e) => e.id === selectedKey) ?? null;
  const detail = selectedEvent
    ? (() => {
        const { startIdx, endIdx } = eventInterval(selectedEvent);
        return {
          who: selectedEvent.name,
          equipment: selectedEvent.title,
          rangeText: formatRange(startIdx, endIdx),
          leftText: daysLeftLabel(startIdx, endIdx, todayIdx),
        };
      })()
    : null;

  const goPrevMonth = () => {
    setSelectedKey(null);
    setViewMonth0((m) => (m === 0 ? 11 : m - 1));
    if (viewMonth0 === 0) setViewYear((y) => y - 1);
  };
  const goNextMonth = () => {
    setSelectedKey(null);
    setViewMonth0((m) => (m === 11 ? 0 : m + 1));
    if (viewMonth0 === 11) setViewYear((y) => y + 1);
  };

  if (isFetching) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      {/* ビュー切替 + 月ラベル */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex w-[180px] rounded-xl bg-[#E9EDF1] p-[3px]">
          {(["month", "gantt"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-8 flex-1 rounded-[9px] text-xs font-bold transition-colors",
                view === v ? "bg-white text-ink shadow-sm" : "text-ink-muted"
              )}
            >
              {v === "month" ? "月表示" : "機材ガント"}
            </button>
          ))}
        </div>
        {view === "month" && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft"
              aria-label="前の月"
            >
              ‹
            </button>
            <span className="min-w-[92px] text-center text-sm font-black">{matrix.monthLabel}</span>
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

      {view === "month" ? (
        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <MemberChips
              members={members}
              value={memberFilter}
              onChange={setMemberFilter}
              className="mb-3"
            />
            <MonthGrid<CalendarEvent>
              weeks={weeks}
              selectedKey={selectedKey ?? undefined}
              onBarClick={(bar) => setSelectedKey(Number(bar.key))}
              isDimmed={(bar) =>
                memberFilter != null && bar.data?.name !== memberFilter
              }
            />
          </div>
          <div className="md:sticky md:top-24 md:self-start">
            {detail ? (
              <EventDetailPopover detail={detail} />
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-[12.5px] text-ink-faint">
                バーをタップすると
                <br />
                「誰が・何を・いつまで」を表示
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          {ganttRows.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-ink-faint">
              この期間に貸出中の機材はありません
            </p>
          ) : (
            <EquipmentGantt<CalendarEvent>
              windowStartIdx={ganttWindowStart}
              dayCount={ganttDayCount}
              todayIdx={todayIdx}
              rows={ganttRows}
              onBarClick={(bar) => bar.data && setSelectedKey(Number(bar.key))}
            />
          )}
          {detail && (
            <div className="mt-3">
              <EventDetailPopover detail={detail} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
