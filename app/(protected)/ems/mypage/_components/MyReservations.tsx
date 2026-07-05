"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMyReserves } from "@/app/(protected)/ems/mypage/hooks/use-my-reserves";
import { useEquipments } from "@/app/(protected)/ems/_hooks/use-equipments";
import { useCategories } from "@/app/(protected)/ems/equipment-list/hooks/use-categories";

import {
  buildMonthMatrix,
  toJstDayIndex,
  todayJstDayIndex,
  formatRange,
} from "@/lib/calendar/date-grid";
import { buildMonthWeeks, type CalendarBarEvent } from "@/lib/calendar/build-month-weeks";
import { categoryColor } from "@/lib/category-colors";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { CategoryChip } from "@/components/shared/category-chip";
import { Skeleton } from "@/components/ui/skeleton";

interface Grouped {
  key: string;
  startIdx: number;
  endIdx: number;
  items: { id: number; name: string; color: string }[];
  maxRenting: number;
}

// isRenting（0予約中/1受取可/2貸出中/3滞納）をバッジに写像。グループ内の最も進んだ状態を採用。
function badgeOf(maxRenting: number, active: boolean): { tone: StatusTone; label: string } {
  if (maxRenting >= 3) return { tone: "danger", label: "滞納" };
  if (maxRenting === 2) return { tone: "danger", label: "貸出中" };
  if (maxRenting === 1 || active) return { tone: "info", label: "受取可" };
  return { tone: "neutral", label: "予約済" };
}

export function MyReservations() {
  const router = useRouter();
  const user = useCurrentUser();
  const { filteredData } = useMyReserves({ userId: user?.id });
  const { equipments, isLoading: eqLoading } = useEquipments();
  const { categories } = useCategories();

  const todayIdx = todayJstDayIndex();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth0, setViewMonth0] = useState(now.getMonth());
  const matrix = useMemo(() => buildMonthMatrix(viewYear, viewMonth0), [viewYear, viewMonth0]);

  const colorOfList = useMemo(() => {
    return (listId: number) => {
      const eq = equipments.find((e) => e.id === listId);
      const cat = categories.find((c) => String(c.id) === String(eq?.tag_id));
      return categoryColor(cat?.color);
    };
  }, [equipments, categories]);

  const nameOfList = useMemo(() => {
    return (listId: number) => equipments.find((e) => e.id === listId)?.name ?? `#${listId}`;
  }, [equipments]);

  // 同一期間(start-end)でグループ化
  const groups = useMemo<Grouped[]>(() => {
    const map = new Map<string, Grouped>();
    filteredData.forEach((r) => {
      const startIdx = toJstDayIndex(r.start);
      const endIdx = toJstDayIndex(r.end);
      const key = `${startIdx}-${endIdx}`;
      let g = map.get(key);
      if (!g) {
        g = { key, startIdx, endIdx, items: [], maxRenting: 0 };
        map.set(key, g);
      }
      g.items.push({ id: r.list_id, name: nameOfList(r.list_id), color: colorOfList(r.list_id) });
      g.maxRenting = Math.max(g.maxRenting, r.isRenting ?? 0);
    });
    return [...map.values()].sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx);
  }, [filteredData, nameOfList, colorOfList]);

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
          label: multi ? `${g.items[0].name} 他${g.items.length - 1}件` : g.items[0].name,
        };
      }),
    [groups]
  );
  const weeks = useMemo(
    () => buildMonthWeeks(barEvents, matrix, { headH: 18, laneH: 20, minH: 58 }),
    [barEvents, matrix]
  );

  // カードのセクション分け（利用中/今後/終了）
  const sections = useMemo(() => {
    const active: Grouped[] = [];
    const upcoming: Grouped[] = [];
    const past: Grouped[] = [];
    groups.forEach((g) => {
      if (g.endIdx < todayIdx) past.push(g);
      else if (g.startIdx > todayIdx) upcoming.push(g);
      else active.push(g);
    });
    return [
      { label: "利用中・受取可", items: active },
      { label: "今後の予約", items: upcoming },
      { label: "終了した予約", items: past },
    ].filter((s) => s.items.length > 0);
  }, [groups, todayIdx]);

  const goPrevMonth = () => {
    setViewMonth0((m) => (m === 0 ? 11 : m - 1));
    if (viewMonth0 === 0) setViewYear((y) => y - 1);
  };
  const goNextMonth = () => {
    setViewMonth0((m) => (m === 11 ? 0 : m + 1));
    if (viewMonth0 === 11) setViewYear((y) => y + 1);
  };

  if (eqLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[320px] w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_360px] md:items-start">
      {/* 自分の予定カレンダー */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[15px] font-black">自分の予定カレンダー</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={goPrevMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft" aria-label="前の月">
              ‹
            </button>
            <span className="min-w-[84px] text-center text-xs text-ink-faint">{matrix.monthLabel}</span>
            <button type="button" onClick={goNextMonth} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft" aria-label="次の月">
              ›
            </button>
          </div>
        </div>
        <MonthGrid weeks={weeks} />
        {groups.length === 0 && (
          <p className="mt-3 text-center text-[11.5px] text-ink-faint">まだ予約はありません</p>
        )}
      </div>

      {/* 予約カード */}
      <div>
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-faint">
            予約はまだありません。
            <button
              type="button"
              onClick={() => router.push("/ems/equipment-list")}
              className="mt-3 block w-full rounded-xl bg-brand py-2.5 text-[13px] font-bold text-white"
            >
              予約する
            </button>
          </div>
        ) : (
          sections.map((sec) => (
            <div key={sec.label} className="mb-4">
              <p className="mb-2 px-1 text-xs font-bold text-ink-muted">{sec.label}</p>
              <div className="flex flex-col gap-2.5">
                {sec.items.map((g) => {
                  const active = g.startIdx <= todayIdx && g.endIdx >= todayIdx;
                  const badge = badgeOf(g.maxRenting, active);
                  const days = g.endIdx - g.startIdx + 1;
                  return (
                    <div
                      key={g.key}
                      className="rounded-2xl bg-white p-4 shadow-sm"
                      style={{ borderLeft: `4px solid ${active ? "#2E90FA" : "#D0D5DD"}` }}
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[15px] font-extrabold">
                            {formatRange(g.startIdx, g.endIdx)}{" "}
                            <span className="text-[11px] font-semibold text-ink-faint">{days}日間</span>
                          </p>
                          <p className="m-0 mt-0.5 text-[11px] text-ink-muted">機材 {g.items.length}件</p>
                        </div>
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((it) => (
                          <CategoryChip key={it.id} name={it.name} color={it.color} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
