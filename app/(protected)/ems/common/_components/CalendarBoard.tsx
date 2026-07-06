"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useCalendarData,
  prefetchCalendarWindow,
  type CalendarEvent,
} from "@/app/(protected)/ems/common/hooks/use-calendar-data";
import {
  buildMonthMatrix,
  toJstDayIndex,
  todayJstDayIndex,
  formatRange,
} from "@/lib/calendar/date-grid";
import { buildMonthWeeks, type CalendarBarEvent } from "@/lib/calendar/build-month-weeks";
import { memberColorMap, memberInitial } from "@/lib/calendar/member-colors";
import { daysLeftLabel } from "@/lib/calendar/reservation-labels";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { EquipmentGantt, type GanttRow } from "@/components/calendar/EquipmentGantt";
import { MemberChips } from "@/components/calendar/MemberChips";
import { EventDetailPopover } from "@/components/calendar/EventDetailPopover";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/hooks/use-is-desktop";

type View = "month" | "gantt";

// イベントを inclusive な day index 区間へ変換
function eventInterval(ev: CalendarEvent) {
  return { startIdx: toJstDayIndex(ev.start), endIdx: toJstDayIndex(ev.end) };
}

export function CalendarBoard({ initialView = "month" }: { initialView?: View }) {
  const todayIdx = todayJstDayIndex();
  // PC では行高を上げてカレンダーを画面の高さに合わせて大きく見せる
  const isDesktop = useIsDesktop();

  const [view, setView] = useState<View>(initialView);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  // モバイルでは詳細カードがグリッドの下に積まれるため、バーをタップしても
  // 画面外で「反応がない」ように見える。選択時にカードまでスクロールする。
  const detailRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedKey != null && !isDesktop) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedKey, isDesktop]);

  // 今日を含む月を初期表示。前後移動できる。
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(todayDate.getMonth());

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

  // データは「いま画面に必要な窓」だけ取得する（月表示=月グリッド、ガント=14日窓）。
  // 窓の外の予約はサーバー側で絞られるため、履歴が増えても取得・描画コストは一定。
  const { allEvents, isFetching, isError, isWindowLoading, isWindowError, refetch } =
    useCalendarData(
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

  // 絞り込みチップは「表示中の月グリッドに予約が掛かる部員」だけに絞る
  // （全期間の部員を並べるとチップが縦に膨らむうえ、選んでも何も起きない）。
  const members = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => {
      if (!e.name) return;
      const { startIdx, endIdx } = eventInterval(e);
      if (endIdx >= gridStartIdx && startIdx <= gridEndIdx) set.add(e.name);
    });
    return [...set];
  }, [allEvents, gridStartIdx, gridEndIdx]);

  // 月を移動して選択中の部員がいなくなったら「すべて」に戻す
  useEffect(() => {
    if (memberFilter != null && !members.includes(memberFilter)) setMemberFilter(null);
  }, [members, memberFilter]);

  // 「色＝人」の前提を守るため、素のハッシュ色（少人数でも高確率で衝突する）ではなく
  // 重複しない割り当てを使う。表示中の月の部員（members）を優先して割り当てることで、
  // 履歴上の部員が16人を超えても「いま見えている月」の中では一意性が守られる。
  // チップ・詳細カードも同じ割り当てを共有する。
  const memberColorOf = useMemo(() => {
    const map = memberColorMap(allEvents.map((e) => e.name), members);
    return (name: string | null | undefined) => (name && map.get(name)) || "#667085";
  }, [allEvents, members]);

  const barEvents = useMemo<CalendarBarEvent<CalendarEvent>[]>(
    () =>
      allEvents.map((ev) => {
        const { startIdx, endIdx } = eventInterval(ev);
        return {
          key: ev.id,
          startIdx,
          endIdx,
          color: memberColorOf(ev.name),
          label: ev.title,
          data: ev,
        };
      }),
    [allEvents, memberColorOf]
  );

  const weeks = useMemo(
    () =>
      buildMonthWeeks(
        barEvents,
        matrix,
        isDesktop
          ? { headH: 26, laneH: 26, minH: 104 }
          : // モバイルはレーン間隔を広げてバー(18px)のタップしやすさを確保する
            { headH: 20, laneH: 22, minH: 64 }
      ),
    [barEvents, matrix, isDesktop]
  );

  const ganttRows = useMemo<GanttRow<CalendarEvent>[]>(() => {
    const byEquip = new Map<string, GanttRow<CalendarEvent>>();
    allEvents.forEach((ev) => {
      const { startIdx, endIdx } = eventInterval(ev);
      if (endIdx < ganttWindowStart || startIdx > ganttWindowEnd) return;
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
        color: memberColorOf(ev.name),
        initial: memberInitial(ev.name),
        label: `〜${formatRange(endIdx, endIdx)}`,
        data: ev,
      });
    });
    return [...byEquip.values()];
  }, [allEvents, ganttWindowStart, ganttWindowEnd, memberColorOf]);

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
  const isCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth0 === todayDate.getMonth();
  const goToday = () => {
    setSelectedKey(null);
    setViewYear(todayDate.getFullYear());
    setViewMonth0(todayDate.getMonth());
  };

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
        {view === "gantt" && (
          <div className="ml-auto flex items-center gap-1">
            {ganttWeekOffset !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedKey(null);
                  setGanttWeekOffset(0);
                }}
                className="flex h-8 items-center rounded-lg px-2.5 text-xs font-bold text-brand hover:bg-line-soft"
              >
                今日
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedKey(null);
                setGanttWeekOffset((o) => o - 1);
              }}
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
              onClick={() => {
                setSelectedKey(null);
                setGanttWeekOffset((o) => o + 1);
              }}
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
        // grid-cols-1（minmax(0,1fr)）を明示しないと、モバイルでトラックが
        // コンテンツ幅に広がり画面からはみ出す
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div
            className={cn(
              "rounded-2xl bg-white p-4 shadow-sm transition-opacity",
              // 窓の取得中は前の窓を出したまま淡くする（前後月はプリフェッチ済みのため稀）
              isWindowLoading && "opacity-60"
            )}
          >
            <MemberChips
              members={members}
              value={memberFilter}
              onChange={setMemberFilter}
              colorOf={memberColorOf}
              className="mb-3"
            />
            <MonthGrid<CalendarEvent>
              weeks={weeks}
              barHeight={isDesktop ? 22 : 18}
              selectedKey={selectedKey ?? undefined}
              onBarClick={(bar) => setSelectedKey(Number(bar.key))}
              isDimmed={(bar) =>
                memberFilter != null && bar.data?.name !== memberFilter
              }
            />
          </div>
          <div ref={detailRef} className="md:sticky md:top-24 md:self-start scroll-mt-20">
            {detail ? (
              <EventDetailPopover detail={detail} color={memberColorOf(detail.who)} />
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
        <div
          className={cn(
            "rounded-2xl bg-white p-3 shadow-sm transition-opacity",
            isWindowLoading && "opacity-60"
          )}
        >
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
            <div ref={detailRef} className="mt-3 scroll-mt-20">
              <EventDetailPopover detail={detail} color={memberColorOf(detail.who)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
