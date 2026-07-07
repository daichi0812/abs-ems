import { useMemo } from "react";
import {
  toJstDayIndex,
  formatRange,
  type MonthMatrix,
} from "@/lib/calendar/date-grid";
import { buildMonthWeeks, type CalendarBarEvent } from "@/lib/calendar/build-month-weeks";
import { memberColorMap, memberInitial } from "@/lib/calendar/member-colors";
import { daysLeftLabel } from "@/lib/calendar/reservation-labels";
import { type GanttRow } from "@/components/calendar/EquipmentGantt";
import { type CalendarEvent } from "@/app/(protected)/ems/common/hooks/use-calendar-data";

// イベントを inclusive な day index 区間へ変換
function eventInterval(ev: CalendarEvent) {
  return { startIdx: toJstDayIndex(ev.start), endIdx: toJstDayIndex(ev.end) };
}

interface UseCalendarDerivedParams {
  allEvents: CalendarEvent[];
  memberColors: Map<string, string>;
  memberImages: Map<string, string>;
  matrix: MonthMatrix;
  gridStartIdx: number;
  gridEndIdx: number;
  isDesktop: boolean;
  ganttWindowStart: number;
  ganttWindowEnd: number;
  selectedKey: number | null;
  todayIdx: number;
}

/**
 * カレンダーの派生データ（表示中月の部員一覧・色/アイコン割り当て、月グリッドのバー・週
 * レイアウト、機材ガントの行、選択中イベントの詳細）をまとめて算出する。
 * CalendarBoard 本体からドメインロジックを切り出したもの。
 */
export function useCalendarDerived({
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
}: UseCalendarDerivedParams) {
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

  // 「色＝人」の前提を守るため、素のハッシュ色（少人数でも高確率で衝突する）ではなく
  // 重複しない割り当てを使う。本人が設定ページで選んだ色（memberColors）を最優先し、
  // 未選択の部員は表示中の月の部員（members）を優先して割り当てることで、
  // 履歴上の部員が16人を超えても「いま見えている月」の中では一意性が守られる。
  // チップ・詳細カードも同じ割り当てを共有する。
  const memberColorOf = useMemo(() => {
    const map = memberColorMap(allEvents.map((e) => e.name), members, memberColors);
    return (name: string | null | undefined) => (name && map.get(name)) || "#667085";
  }, [allEvents, members, memberColors]);

  // 本人が設定したアイコン画像（チップ・詳細カード・ガントのバーで使う）
  const memberImageOf = useMemo(
    () => (name: string | null | undefined) => (name ? memberImages.get(name) : undefined),
    [memberImages]
  );

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
        image: memberImageOf(ev.name),
        label: `〜${formatRange(endIdx, endIdx)}`,
        data: ev,
      });
    });
    return [...byEquip.values()];
  }, [allEvents, ganttWindowStart, ganttWindowEnd, memberColorOf, memberImageOf]);

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

  return {
    members,
    memberColorOf,
    memberImageOf,
    barEvents,
    weeks,
    ganttRows,
    selectedEvent,
    detail,
  };
}
