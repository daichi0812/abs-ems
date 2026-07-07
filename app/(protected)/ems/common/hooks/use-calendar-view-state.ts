"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildMonthMatrix } from "@/lib/calendar/date-grid";
import { useMonthNav } from "@/hooks/use-month-nav";

export type View = "month" | "gantt";

interface UseCalendarViewStateParams {
  initialView: View;
  todayIdx: number;
  isDesktop: boolean;
}

/**
 * カレンダーの表示状態（月/ガント切替、ガント週送り、バー選択）と、それに紐づく副作用
 * （選択時のスクロール）、および表示中の窓の day index 境界を一手に扱うフック。
 * 月送り自体は共通の useMonthNav に委譲する。
 * CalendarBoard 本体からビュー状態のロジックを切り出したもの。
 */
export function useCalendarViewState({
  initialView,
  todayIdx,
  isDesktop,
}: UseCalendarViewStateParams) {
  const [view, setView] = useState<View>(initialView);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  // モバイルでは詳細カードがグリッドの下に積まれるため、バーをタップしても
  // 画面外で「反応がない」ように見える。選択時にカードまでスクロールする。
  const detailRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedKey != null && !isDesktop) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedKey, isDesktop]);

  // 今日を含む月を初期表示。前後移動できる。月を移動したら選択を解除する。
  const { viewYear, viewMonth0, isCurrentMonth, goPrevMonth, goNextMonth, goToday } =
    useMonthNav(() => setSelectedKey(null));

  const matrix = useMemo(
    () => buildMonthMatrix(viewYear, viewMonth0),
    [viewYear, viewMonth0]
  );

  const gridStartIdx = matrix.weeks[0][0].dayIndex;
  const gridEndIdx = matrix.weeks[matrix.weeks.length - 1][6].dayIndex;

  // ガント: 既定は「今日の3日前から14日窓」。1週間単位で前後に送れる
  //（固定窓だと来週末より先の空きが確認できず、月表示への切替に気づかないと詰む）。
  const [ganttWeekOffset, setGanttWeekOffset] = useState(0);
  const ganttDayCount = 14;
  const ganttWindowStart = todayIdx - 3 + ganttWeekOffset * 7;
  const ganttWindowEnd = ganttWindowStart + ganttDayCount - 1;

  const goGanttToday = () => {
    setSelectedKey(null);
    setGanttWeekOffset(0);
  };
  const goGanttPrev = () => {
    setSelectedKey(null);
    setGanttWeekOffset((o) => o - 1);
  };
  const goGanttNext = () => {
    setSelectedKey(null);
    setGanttWeekOffset((o) => o + 1);
  };

  return {
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
  };
}
