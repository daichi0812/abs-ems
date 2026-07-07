"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMyReserves } from "@/app/(protected)/ems/mypage/hooks/use-my-reserves";
import { useEquipments } from "@/app/(protected)/ems/hooks/use-equipments";
import { useCategories } from "@/app/(protected)/ems/equipment-list/hooks/use-categories";

import { todayJstDayIndex } from "@/lib/calendar/date-grid";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { useReserveActions } from "@/app/(protected)/ems/mypage/hooks/use-reserve-actions";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useMonthNav } from "@/hooks/use-month-nav";
import { useMyReservationGroups } from "@/app/(protected)/ems/mypage/hooks/use-my-reservation-groups";
import { ReservationCard, type ReserveActionTarget } from "./ReservationCard";
import { CancelReturnDialogs } from "./CancelReturnDialogs";

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
  const [cancelTarget, setCancelTarget] = useState<ReserveActionTarget | null>(null);
  // 返却確認の対象。返却は取り消せない操作（isRenting 4→2 の遷移が無い）なので確認を挟む。
  const [returnTarget, setReturnTarget] = useState<ReserveActionTarget | null>(null);
  // 「終了した予約」は履歴が無限に溜まるため、既定は直近数件だけ表示する
  const [showAllPast, setShowAllPast] = useState(false);
  const isDesktop = useIsDesktop();

  const todayIdx = todayJstDayIndex();
  const { viewYear, viewMonth0, goPrevMonth, goNextMonth } = useMonthNav();

  const { matrix, groups, weeks, sections, overdueCount } = useMyReservationGroups({
    reserves: filteredData,
    equipments,
    categories,
    todayIdx,
    viewYear,
    viewMonth0,
    isDesktop,
  });

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
                {visibleItems.map((g) => (
                  <ReservationCard
                    key={g.key}
                    group={g}
                    todayIdx={todayIdx}
                    pendingIds={pendingIds}
                    borrow={borrow}
                    borrowMany={borrowMany}
                    onReturnRequest={setReturnTarget}
                    onCancelRequest={setCancelTarget}
                  />
                ))}
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

      <CancelReturnDialogs
        cancelTarget={cancelTarget}
        returnTarget={returnTarget}
        onCancelClose={() => setCancelTarget(null)}
        onReturnClose={() => setReturnTarget(null)}
        onConfirmCancel={(ids) =>
          void (ids.length === 1 ? cancel(ids[0]) : cancelMany(ids))
        }
        onConfirmReturn={(ids) =>
          void (ids.length === 1 ? giveBack(ids[0]) : giveBackMany(ids))
        }
      />
      </div>
    </div>
  );
}
