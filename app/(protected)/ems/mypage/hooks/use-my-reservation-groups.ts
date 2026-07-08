import { useMemo } from "react";

import {
  buildMonthMatrix,
  toJstDayIndex,
} from "@/lib/calendar/date-grid";
import { buildMonthWeeks, type CalendarBarEvent } from "@/lib/calendar/build-month-weeks";
import { categoryColor } from "@/lib/category-colors";
import type { StatusTone } from "@/components/shared/status-badge";
import type { Equipment } from "@/types/domain";

export interface GroupedItem {
  reserveId: number;
  listId: number;
  name: string;
  color: string;
  isRenting: number; // 0:予約中 / 1:受取可 / 2:貸出中 / 3:滞納 / 4:返却済
}

export interface Grouped {
  key: string;
  startIdx: number;
  endIdx: number;
  items: GroupedItem[];
}

export interface ReservationSection {
  label: string;
  items: Grouped[];
}

/**
 * グループ全体の状態バッジ。滞納 > 貸出中 > 返却済（全件） > 受取可 > 予約済 の優先順。
 * 滞納は isRenting=3 のほか「貸出中のまま期限超過」も日付から導出する。
 */
export function badgeOf(
  g: Grouped,
  todayIdx: number
): { tone: StatusTone; label: string } {
  const states = g.items.map((it) => it.isRenting ?? 0);
  const active = g.startIdx <= todayIdx && g.endIdx >= todayIdx;
  const overdue = states.includes(3) || (states.includes(2) && g.endIdx < todayIdx);
  if (overdue) return { tone: "danger", label: "滞納" };
  if (states.includes(2)) return { tone: "danger", label: "貸出中" };
  if (states.length > 0 && states.every((s) => s === 4))
    return { tone: "success", label: "返却済" };
  if (states.includes(1) || active) return { tone: "info", label: "受取可" };
  return { tone: "neutral", label: "予約済" };
}

export interface ReservationLike {
  id: number;
  list_id: number;
  start: string | Date;
  end: string | Date;
  isRenting?: number;
}

interface UseMyReservationGroupsParams {
  reserves: ReservationLike[];
  equipments: Equipment[];
  categories: { id: string | number; color?: string; tag_id?: unknown }[];
  todayIdx: number;
  viewYear: number;
  viewMonth0: number;
  isDesktop: boolean;
}

/**
 * マイ予約の派生データ（同一期間でのグループ化、カレンダーのバー・週レイアウト、
 * 要返却/利用中/今後/終了のセクション分け、延滞件数）をまとめて算出する。
 * MyReservations 本体からドメインロジックを切り出したもの。
 */
export function useMyReservationGroups({
  reserves,
  equipments,
  categories,
  todayIdx,
  viewYear,
  viewMonth0,
  isDesktop,
}: UseMyReservationGroupsParams) {
  const matrix = useMemo(
    () => buildMonthMatrix(viewYear, viewMonth0),
    [viewYear, viewMonth0]
  );

  const colorOfList = useMemo(() => {
    return (listId: number) => {
      const eq = equipments.find((e) => e.id === listId);
      const cat = categories.find((c) => String(c.id) === String(eq?.tag_id));
      return categoryColor(cat?.color);
    };
  }, [equipments, categories]);

  const nameOfList = useMemo(() => {
    return (listId: number) =>
      equipments.find((e) => e.id === listId)?.name ?? `#${listId}`;
  }, [equipments]);

  // 同一期間(start-end)でグループ化
  const groups = useMemo<Grouped[]>(() => {
    const map = new Map<string, Grouped>();
    reserves.forEach((r) => {
      const startIdx = toJstDayIndex(r.start);
      const endIdx = toJstDayIndex(r.end);
      const key = `${startIdx}-${endIdx}`;
      let g = map.get(key);
      if (!g) {
        g = { key, startIdx, endIdx, items: [] };
        map.set(key, g);
      }
      g.items.push({
        reserveId: r.id,
        listId: r.list_id,
        name: nameOfList(r.list_id),
        color: colorOfList(r.list_id),
        isRenting: r.isRenting ?? 0,
      });
    });
    return [...map.values()].sort(
      (a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx
    );
  }, [reserves, nameOfList, colorOfList]);

  // 自分の予定カレンダー（期間ごとに1バー、複数機材は「○○ 他N件」）
  const barEvents = useMemo<CalendarBarEvent[]>(
    () =>
      groups.map((g) => {
        const multi = g.items.length > 1;
        return {
          key: g.key,
          startIdx: g.startIdx,
          endIdx: g.endIdx,
          color: multi ? "#2E90FA" : g.items[0].color,
          label: multi
            ? `${g.items[0].name} 他${g.items.length - 1}件`
            : g.items[0].name,
        };
      }),
    [groups]
  );

  const weeks = useMemo(
    () =>
      buildMonthWeeks(
        barEvents,
        matrix,
        isDesktop
          ? { headH: 26, laneH: 26, minH: 96 }
          : { headH: 18, laneH: 20, minH: 58 }
      ),
    [barEvents, matrix, isDesktop]
  );

  // カードのセクション分け（要返却/利用中/今後/終了）
  const sections = useMemo<ReservationSection[]>(() => {
    const overdue: Grouped[] = [];
    const active: Grouped[] = [];
    const upcoming: Grouped[] = [];
    const past: Grouped[] = [];
    groups.forEach((g) => {
      const hasUnreturned = g.items.some(
        (it) => it.isRenting === 2 || it.isRenting === 3
      );
      if (g.endIdx < todayIdx && hasUnreturned) {
        // 期限超過なのに未返却の予約。「終了した予約」の山に埋めると
        // 本人がスクロールしない限り延滞に気づけないため、最上部に出す。
        overdue.push(g);
      } else if (g.endIdx < todayIdx) {
        past.push(g);
      } else if (g.startIdx > todayIdx) {
        upcoming.push(g);
      } else {
        active.push(g);
      }
    });
    // 終了した予約は新しい順（「先週返したやつ」を探すのに全履歴を遡らせない）
    past.reverse();
    return [
      { label: "要返却（期限超過）", items: overdue },
      { label: "利用中・受取可", items: active },
      { label: "今後の予約", items: upcoming },
      { label: "終了した予約", items: past },
    ].filter((s) => s.items.length > 0);
  }, [groups, todayIdx]);

  // ページ上部の延滞バナー用（未返却のまま期限を過ぎた機材の件数）
  const overdueCount = useMemo(
    () =>
      groups.reduce(
        (n, g) =>
          g.endIdx < todayIdx
            ? n +
              g.items.filter((it) => it.isRenting === 2 || it.isRenting === 3)
                .length
            : n,
        0
      ),
    [groups, todayIdx]
  );

  return { matrix, groups, barEvents, weeks, sections, overdueCount };
}
