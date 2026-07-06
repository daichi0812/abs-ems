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
import { useMonthNav } from "@/hooks/use-month-nav";

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
  const {
    filteredData,
    isLoading: reservesLoading,
    isError: reservesError,
    hasLoaded: reservesLoaded,
    refetch,
  } = useMyReserves({ userId: user?.id });
  const { equipments, isLoading: eqLoading } = useEquipments();
  const { categories } = useCategories();
  const { pendingIds, borrow, borrowMany, giveBack, giveBackMany, cancel, cancelMany } =
    useReserveActions({ refetch });
  // キャンセル確認の対象。単体は items 1件、一括は複数件。
  const [cancelTarget, setCancelTarget] = useState<{
    items: GroupedItem[];
    rangeText: string;
  } | null>(null);
  // 返却確認の対象。返却は取り消せない操作（isRenting 4→2 の遷移が無い）なので確認を挟む。
  const [returnTarget, setReturnTarget] = useState<{
    items: GroupedItem[];
    rangeText: string;
  } | null>(null);
  // 「終了した予約」は履歴が無限に溜まるため、既定は直近数件だけ表示する
  const [showAllPast, setShowAllPast] = useState(false);
  const isDesktop = useIsDesktop();

  const todayIdx = todayJstDayIndex();
  const { viewYear, viewMonth0, goPrevMonth, goNextMonth } = useMonthNav();
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

  // カードのセクション分け（要返却/利用中/今後/終了）
  const sections = useMemo(() => {
    const overdue: Grouped[] = [];
    const active: Grouped[] = [];
    const upcoming: Grouped[] = [];
    const past: Grouped[] = [];
    groups.forEach((g) => {
      const hasUnreturned = g.items.some((it) => it.isRenting === 2 || it.isRenting === 3);
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
            ? n + g.items.filter((it) => it.isRenting === 2 || it.isRenting === 3).length
            : n,
        0
      ),
    [groups, todayIdx]
  );

  // 予約の取得完了前に判定すると、予約がある部員にも「予約はまだありません。」が
  // 一瞬表示されてしまうため、機材と予約の両方の完了を待つ。
  if (eqLoading || reservesLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[320px] w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  // 全画面エラーは「一度も取得できていない」ときだけ。返却・キャンセル成功後の
  // refetch が失敗したケースで画面ごと乗っ取ると、「返却しました」のトーストと
  // エラー画面が同時に出る矛盾した状態になる（表示済みの一覧は維持する）。
  if (reservesError && !reservesLoaded) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-ink">予約を読み込めませんでした。</p>
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
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3">
          <svg
            className="flex-none text-danger"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <p className="m-0 text-[13px] font-bold text-danger">
            返却期限を過ぎた機材が {overdueCount}件 あります。「要返却」から返却してください。
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
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
          sections.map((sec) => {
            const isPast = sec.label === "終了した予約";
            const collapsed = isPast && !showAllPast && sec.items.length > 5;
            const visibleItems = collapsed ? sec.items.slice(0, 5) : sec.items;
            return (
            <div key={sec.label} className="mb-4">
              <p className="mb-2 px-1 text-xs font-bold text-ink-muted">{sec.label}</p>
              <div className="flex flex-col gap-2.5">
                {visibleItems.map((g) => {
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
                                  onClick={() => setReturnTarget({ items: [it], rangeText })}
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
                                setReturnTarget({ items: returnables, rangeText })
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
                {collapsed && (
                  <button
                    type="button"
                    onClick={() => setShowAllPast(true)}
                    className="h-10 rounded-xl border-[1.5px] border-line bg-white text-[12.5px] font-bold text-ink-muted transition-colors hover:bg-line-soft"
                  >
                    すべて表示（あと{sec.items.length - visibleItems.length}件）
                  </button>
                )}
              </div>
            </div>
            );
          })
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

      {/* 返却確認。誤タップで即「返却済」になると本人が元に戻せない（4→2 の遷移が無い）ため、
          キャンセルと同じく確認を挟む */}
      <AlertDialog
        open={returnTarget != null}
        onOpenChange={(open) => !open && setReturnTarget(null)}
      >
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">機材を返却しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px]">
              {returnTarget?.items.length === 1
                ? `「${returnTarget.items[0].name}」を返却済みにします。`
                : `${returnTarget?.rangeText} の機材 ${returnTarget?.items.length}件（${returnTarget?.items
                    .map((it) => it.name)
                    .join("・")}）を返却済みにします。`}
              機材は所定の場所に戻しましたか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (returnTarget) {
                  const ids = returnTarget.items.map((it) => it.reserveId);
                  void (ids.length === 1 ? giveBack(ids[0]) : giveBackMany(ids));
                }
                setReturnTarget(null);
              }}
            >
              返却する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
