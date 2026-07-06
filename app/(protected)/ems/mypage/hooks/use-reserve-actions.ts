"use client";

import { useState } from "react";
import { toast } from "sonner";

export interface UseReserveActionsParams {
  refetch: () => Promise<void>;
}

// マイ予約カードの操作（借りる / 返却 / キャンセル）。単体と同一期間グループの一括の両方に対応。
// 借りる・返却は PATCH /api/reserves/[id]（isRenting 遷移）、キャンセルは DELETE。
// 成否は toast で通知し、1件でも成功したら一覧を refetch する。
export const useReserveActions = ({ refetch }: UseReserveActionsParams) => {
  const [pendingIds, setPendingIds] = useState<number[]>([]);

  // 成功なら null、失敗なら表示用のエラーメッセージを返す
  const patchOne = async (reserveId: number, isRenting: 2 | 4): Promise<string | null> => {
    try {
      const res = await fetch(`/api/reserves/${reserveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRenting }),
      });
      if (res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.error ?? "操作に失敗しました";
    } catch {
      return "操作に失敗しました";
    }
  };

  const deleteOne = async (reserveId: number): Promise<string | null> => {
    try {
      const res = await fetch(`/api/reserves/${reserveId}`, { method: "DELETE" });
      if (res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.error ?? "キャンセルに失敗しました";
    } catch {
      return "キャンセルに失敗しました";
    }
  };

  /**
   * 複数件を並列実行し、成功/失敗数に応じた toast と refetch をまとめて行う。
   * 1件だけの失敗は API のエラーメッセージをそのまま出す。全件成功で true。
   */
  const runMany = async (
    reserveIds: number[],
    run: (id: number) => Promise<string | null>,
    okMessage: (count: number) => string,
    failMessage: (count: number) => string
  ): Promise<boolean> => {
    if (reserveIds.length === 0) return true;
    setPendingIds(reserveIds);
    try {
      const results = await Promise.all(reserveIds.map((id) => run(id)));
      const errors = results.filter((r): r is string => r !== null);
      const okCount = reserveIds.length - errors.length;
      if (errors.length === 0) {
        toast.success(okMessage(okCount));
      } else {
        toast.error(errors.length === 1 ? errors[0] : failMessage(errors.length));
      }
      if (okCount > 0) await refetch();
      return errors.length === 0;
    } finally {
      setPendingIds([]);
    }
  };

  /** 借りる（受取）: isRenting 0|1 → 2 */
  const borrow = (reserveId: number) =>
    runMany(
      [reserveId],
      (id) => patchOne(id, 2),
      () => "貸し出しを開始しました",
      (n) => `${n}件は貸し出しできませんでした`
    );

  /** 同一期間グループをまとめて借りる */
  const borrowMany = (reserveIds: number[]) =>
    runMany(
      reserveIds,
      (id) => patchOne(id, 2),
      (n) => `${n}件の貸し出しを開始しました`,
      (n) => `${n}件は貸し出しできませんでした`
    );

  /** 返却: isRenting 2|3 → 4 */
  const giveBack = (reserveId: number) =>
    runMany(
      [reserveId],
      (id) => patchOne(id, 4),
      () => "返却しました",
      (n) => `${n}件は返却できませんでした`
    );

  /** 同一期間グループをまとめて返却 */
  const giveBackMany = (reserveIds: number[]) =>
    runMany(
      reserveIds,
      (id) => patchOne(id, 4),
      (n) => `${n}件を返却しました`,
      (n) => `${n}件は返却できませんでした`
    );

  /** 予約キャンセル（削除）。貸出中のものはサーバー側でも拒否される。 */
  const cancel = (reserveId: number) =>
    runMany(
      [reserveId],
      deleteOne,
      () => "予約をキャンセルしました",
      (n) => `${n}件はキャンセルできませんでした`
    );

  /** 同一期間グループをまとめてキャンセル */
  const cancelMany = (reserveIds: number[]) =>
    runMany(
      reserveIds,
      deleteOne,
      (n) => `${n}件の予約をキャンセルしました`,
      (n) => `${n}件はキャンセルできませんでした`
    );

  return { pendingIds, borrow, borrowMany, giveBack, giveBackMany, cancel, cancelMany };
};
