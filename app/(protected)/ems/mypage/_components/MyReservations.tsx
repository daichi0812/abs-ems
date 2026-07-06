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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useReserveActions } from "@/app/(protected)/ems/mypage/hooks/use-reserve-actions";
import { useIsDesktop } from "@/hooks/use-is-desktop";

interface GroupedItem {
  reserveId: number;
  listId: number;
  name: string;
  color: string;
  isRenting: number; // 0:予約中 / 1:受取可 / 2:貸出中 / 3:滞納 / 4:返却済
}

interface Grouped {
  key: string;
  startIdx: number;
  endIdx: number;
  items: GroupedItem[];
}

// グループ全体の状態バッジ。滞納 > 貸出中 > 返却済（全件） > 受取可 > 予約済 の優先順。
// 滞納は isRenting=3 のほか「貸出中のまま期限超過」も日付から導出する。
function badgeOf(g: Grouped, todayIdx: number): { tone: StatusTone; label: string } {
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

export function MyReservations() {
  const router = useRouter();
  const user = useCurrentUser();
  const { filteredData, refetch } = useMyReserves({ userId: user?.id });
  const { equipments, isLoading: eqLoading } = useEquipments();
  const { categories } = useCategories();
  const { pendingIds, borrow, borrowMany, giveBack, giveBackMany, cancel, cancelMany } =
    useReserveActions({ refetch });
  // キャンセル確認の対象。単体は items 1件、一括は複数件。
  const [cancelTarget, setCancelTarget] = useState<{
    items: GroupedItem[];
    rangeText: string;
  } | null>(null);
  const isDesktop = useIsDesktop();

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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_380px] md:items-start">
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
        <MonthGrid weeks={weeks} barHeight={isDesktop ? 22 : 18} />
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
                  const badge = badgeOf(g, todayIdx);
                  const days = g.endIdx - g.startIdx + 1;
                  const rangeText = formatRange(g.startIdx, g.endIdx);
                  // 一括操作の対象（2件以上あるときだけグループ操作行を出す）
                  const borrowables = active
                    ? g.items.filter((it) => it.isRenting <= 1)
                    : [];
                  const returnables = g.items.filter(
                    (it) => it.isRenting === 2 || it.isRenting === 3
                  );
                  const cancellables = g.items.filter((it) => it.isRenting <= 1);
                  const showBulk =
                    borrowables.length >= 2 ||
                    returnables.length >= 2 ||
                    cancellables.length >= 2;
                  return (
                    <div
                      key={g.key}
                      className="rounded-2xl bg-white p-4 shadow-sm"
                      style={{ borderLeft: `4px solid ${active ? "#2E90FA" : "#D0D5DD"}` }}
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[15px] font-extrabold">
                            {rangeText}{" "}
                            <span className="text-[11px] font-semibold text-ink-faint">{days}日間</span>
                          </p>
                          <p className="m-0 mt-0.5 text-[11px] text-ink-muted">機材 {g.items.length}件</p>
                        </div>
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {g.items.map((it) => {
                          const canBorrow = active && it.isRenting <= 1;
                          const canReturn = it.isRenting === 2 || it.isRenting === 3;
                          const canCancel = it.isRenting <= 1;
                          const pending = pendingIds.includes(it.reserveId);
                          return (
                            <div
                              key={it.reserveId}
                              className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-1.5"
                            >
                              <span
                                className="h-2 w-2 flex-none rounded-full"
                                style={{ background: it.color }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
                                {it.name}
                              </span>
                              {it.isRenting === 4 && (
                                <span className="text-[10.5px] font-semibold text-ink-faint">
                                  返却済
                                </span>
                              )}
                              {canBorrow && (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => borrow(it.reserveId)}
                                  className="h-7 flex-none rounded-lg bg-brand px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                                >
                                  {pending ? "…" : "借りる"}
                                </button>
                              )}
                              {canReturn && (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => giveBack(it.reserveId)}
                                  className="h-7 flex-none rounded-lg border-[1.5px] border-brand px-2.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand-faint disabled:opacity-50"
                                >
                                  {pending ? "…" : "返却"}
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => setCancelTarget({ items: [it], rangeText })}
                                  className="h-7 flex-none rounded-lg px-2 text-[11px] font-bold text-danger transition-colors hover:bg-[#FEF3F2] disabled:opacity-50"
                                >
                                  キャンセル
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 同一期間のまとめて操作（対象が2件以上あるときだけ） */}
                      {showBulk && (
                        <div className="mt-2.5 flex items-center gap-1.5 border-t border-line-soft pt-2.5">
                          <span className="text-[10.5px] font-bold text-ink-faint">
                            まとめて
                          </span>
                          {borrowables.length >= 2 && (
                            <button
                              type="button"
                              disabled={pendingIds.length > 0}
                              onClick={() =>
                                borrowMany(borrowables.map((it) => it.reserveId))
                              }
                              className="h-7 rounded-lg bg-brand px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                            >
                              借りる（{borrowables.length}件）
                            </button>
                          )}
                          {returnables.length >= 2 && (
                            <button
                              type="button"
                              disabled={pendingIds.length > 0}
                              onClick={() =>
                                giveBackMany(returnables.map((it) => it.reserveId))
                              }
                              className="h-7 rounded-lg border-[1.5px] border-brand px-2.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand-faint disabled:opacity-50"
                            >
                              返却（{returnables.length}件）
                            </button>
                          )}
                          {cancellables.length >= 2 && (
                            <button
                              type="button"
                              disabled={pendingIds.length > 0}
                              onClick={() =>
                                setCancelTarget({ items: cancellables, rangeText })
                              }
                              className="h-7 rounded-lg px-2 text-[11px] font-bold text-danger transition-colors hover:bg-[#FEF3F2] disabled:opacity-50"
                            >
                              キャンセル（{cancellables.length}件）
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* キャンセル確認 */}
      <AlertDialog
        open={cancelTarget != null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">
              予約をキャンセルしますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px]">
              {cancelTarget?.items.length === 1
                ? `「${cancelTarget.items[0].name}」の予約を取り消します。`
                : `${cancelTarget?.rangeText} の予約 ${cancelTarget?.items.length}件（${cancelTarget?.items
                    .map((it) => it.name)
                    .join("・")}）を取り消します。`}
              この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (cancelTarget) {
                  const ids = cancelTarget.items.map((it) => it.reserveId);
                  void (ids.length === 1 ? cancel(ids[0]) : cancelMany(ids));
                }
                setCancelTarget(null);
              }}
            >
              キャンセルする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
