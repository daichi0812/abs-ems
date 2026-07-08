"use client";

import { useEffect, useState } from "react";
import {
  useCalendarData,
  prefetchCalendarWindow,
} from "@/app/(protected)/ems/common/hooks/use-calendar-data";
import { buildMonthMatrix, todayJstDayIndex } from "@/lib/calendar/date-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  useCalendarViewState,
  type View,
} from "@/app/(protected)/ems/common/hooks/use-calendar-view-state";
import { useCalendarDerived } from "@/app/(protected)/ems/common/hooks/use-calendar-derived";
import { CalendarHeader } from "./CalendarHeader";
import { MonthView } from "./MonthView";
import { GanttView } from "./GanttView";

export function CalendarBoard({ initialView = "month" }: { initialView?: View }) {
  const todayIdx = todayJstDayIndex();
  // PC では行高を上げてカレンダーを画面の高さに合わせて大きく見せる
  const isDesktop = useIsDesktop();

  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const {
    view,
    setView,
    selectedKey,
    setSelectedKey,
    detailRef,
    viewYear,
    viewMonth0,
    isCurrentMonth,
    goPrevMonth,
    goNextMonth,
    goToday,
    matrix,
    gridStartIdx,
    gridEndIdx,
    ganttWeekOffset,
    ganttDayCount,
    ganttWindowStart,
    ganttWindowEnd,
    goGanttToday,
    goGanttPrev,
    goGanttNext,
  } = useCalendarViewState({ initialView, todayIdx, isDesktop });

  // データは「いま画面に必要な窓」だけ取得する（月表示=月グリッド、ガント=14日窓）。
  // 窓の外の予約はサーバー側で絞られるため、履歴が増えても取得・描画コストは一定。
  const {
    allEvents,
    memberColors,
    memberImages,
    isFetching,
    isError,
    isWindowLoading,
    isWindowError,
    refetch,
  } = useCalendarData(
      view === "month" ? gridStartIdx : ganttWindowStart,
      view === "month" ? gridEndIdx : ganttWindowEnd
    );

  // 月送りの待ちを実質ゼロにするため、表示が落ち着いたら前後の月グリッドを裏で温める
  useEffect(() => {
    if (view !== "month" || isFetching) return;
    const prevMonth = buildMonthMatrix(
      viewMonth0 === 0 ? viewYear - 1 : viewYear,
      viewMonth0 === 0 ? 11 : viewMonth0 - 1
    );
    const nextMonth = buildMonthMatrix(
      viewMonth0 === 11 ? viewYear + 1 : viewYear,
      viewMonth0 === 11 ? 0 : viewMonth0 + 1
    );
    for (const m of [prevMonth, nextMonth]) {
      prefetchCalendarWindow(m.weeks[0][0].dayIndex, m.weeks[m.weeks.length - 1][6].dayIndex);
    }
  }, [view, viewYear, viewMonth0, isFetching]);

  const {
    members,
    memberColorOf,
    memberImageOf,
    weeks,
    ganttRows,
    detail,
  } = useCalendarDerived({
    allEvents,
    memberColors,
    memberImages,
    matrix,
    gridStartIdx,
    gridEndIdx,
    isDesktop,
    ganttWindowStart,
    ganttWindowEnd,
    selectedKey,
    todayIdx,
  });

  // 月を移動して選択中の部員がいなくなったら「すべて」に戻す
  useEffect(() => {
    if (memberFilter != null && !members.includes(memberFilter)) setMemberFilter(null);
  }, [members, memberFilter]);

  if (isFetching) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-ink">カレンダーを読み込めませんでした。</p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          通信環境を確認して、もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div>
      <CalendarHeader
        view={view}
        onSelectView={setView}
        isCurrentMonth={isCurrentMonth}
        monthLabel={matrix.monthLabel}
        goToday={goToday}
        goPrevMonth={goPrevMonth}
        goNextMonth={goNextMonth}
        ganttWeekOffset={ganttWeekOffset}
        ganttWindowStart={ganttWindowStart}
        ganttWindowEnd={ganttWindowEnd}
        goGanttToday={goGanttToday}
        goGanttPrev={goGanttPrev}
        goGanttNext={goGanttNext}
      />

      {/* 窓の切り替え（月送り・週送り）に失敗しても、表示中のデータは残っているため
          全画面エラーにはせずインラインで再試行を出す */}
      {isWindowError && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-[#FEE4E2] bg-[#FFF5F4] py-2 pl-3.5 pr-2 text-[12.5px] font-bold text-danger">
          この期間の予約を読み込めませんでした
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-3 h-8 flex-none rounded-lg px-2.5 text-xs font-bold text-danger hover:bg-danger/10"
          >
            再試行
          </button>
        </div>
      )}

      {view === "month" ? (
        <MonthView
          isWindowLoading={isWindowLoading}
          members={members}
          memberFilter={memberFilter}
          onMemberChange={setMemberFilter}
          colorOf={memberColorOf}
          imageOf={memberImageOf}
          weeks={weeks}
          isDesktop={isDesktop}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
          detailRef={detailRef}
          detail={detail}
        />
      ) : (
        <GanttView
          isWindowLoading={isWindowLoading}
          ganttRows={ganttRows}
          ganttWindowStart={ganttWindowStart}
          ganttDayCount={ganttDayCount}
          todayIdx={todayIdx}
          onSelectKey={setSelectedKey}
          detailRef={detailRef}
          detail={detail}
          colorOf={memberColorOf}
          imageOf={memberImageOf}
        />
      )}
    </div>
  );
}
