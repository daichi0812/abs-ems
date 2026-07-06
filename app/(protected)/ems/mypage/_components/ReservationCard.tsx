"use client";

import { formatRange } from "@/lib/calendar/date-grid";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  badgeOf,
  type Grouped,
  type GroupedItem,
} from "@/app/(protected)/ems/mypage/hooks/use-my-reservation-groups";

export interface ReserveActionTarget {
  items: GroupedItem[];
  rangeText: string;
}

interface ReservationCardProps {
  group: Grouped;
  todayIdx: number;
  pendingIds: number[];
  borrow: (reserveId: number) => void;
  borrowMany: (reserveIds: number[]) => void;
  onReturnRequest: (target: ReserveActionTarget) => void;
  onCancelRequest: (target: ReserveActionTarget) => void;
}

/** マイ予約の1グループ（同一期間）のカード。機材ごとの行と、2件以上のときの一括操作行を表示する。 */
export function ReservationCard({
  group: g,
  todayIdx,
  pendingIds,
  borrow,
  borrowMany,
  onReturnRequest,
  onCancelRequest,
}: ReservationCardProps) {
  const active = g.startIdx <= todayIdx && g.endIdx >= todayIdx;
  const badge = badgeOf(g, todayIdx);
  const days = g.endIdx - g.startIdx + 1;
  const rangeText = formatRange(g.startIdx, g.endIdx);
  // 一括操作の対象（2件以上あるときだけグループ操作行を出す）
  const borrowables = active ? g.items.filter((it) => it.isRenting <= 1) : [];
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
                  onClick={() => onReturnRequest({ items: [it], rangeText })}
                  className="h-7 flex-none rounded-lg border-[1.5px] border-brand px-2.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand-faint disabled:opacity-50"
                >
                  {pending ? "…" : "返却"}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onCancelRequest({ items: [it], rangeText })}
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
          <span className="text-[10.5px] font-bold text-ink-faint">まとめて</span>
          {borrowables.length >= 2 && (
            <button
              type="button"
              disabled={pendingIds.length > 0}
              onClick={() => borrowMany(borrowables.map((it) => it.reserveId))}
              className="h-7 rounded-lg bg-brand px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              借りる（{borrowables.length}件）
            </button>
          )}
          {returnables.length >= 2 && (
            <button
              type="button"
              disabled={pendingIds.length > 0}
              onClick={() => onReturnRequest({ items: returnables, rangeText })}
              className="h-7 rounded-lg border-[1.5px] border-brand px-2.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand-faint disabled:opacity-50"
            >
              返却（{returnables.length}件）
            </button>
          )}
          {cancellables.length >= 2 && (
            <button
              type="button"
              disabled={pendingIds.length > 0}
              onClick={() => onCancelRequest({ items: cancellables, rangeText })}
              className="h-7 rounded-lg px-2 text-[11px] font-bold text-danger transition-colors hover:bg-[#FEF3F2] disabled:opacity-50"
            >
              キャンセル（{cancellables.length}件）
            </button>
          )}
        </div>
      )}
    </div>
  );
}
