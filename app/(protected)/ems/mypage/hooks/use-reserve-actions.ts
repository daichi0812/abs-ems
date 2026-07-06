"use client";

import { useState } from "react";
import { toast } from "sonner";

export interface UseReserveActionsParams {
  refetch: () => Promise<void>;
}

// マイ予約カードの操作（借りる / 返却 / キャンセル）。
// 借りる・返却は PATCH /api/reserves/[id]（isRenting 遷移）、キャンセルは DELETE。
// 成否は toast で通知し、成功時は一覧を refetch する。
export const useReserveActions = ({ refetch }: UseReserveActionsParams) => {
  const [pendingId, setPendingId] = useState<number | null>(null);

  const patchRenting = async (
    reserveId: number,
    isRenting: 2 | 4,
    okMessage: string
  ): Promise<boolean> => {
    setPendingId(reserveId);
    try {
      const res = await fetch(`/api/reserves/${reserveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRenting }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "操作に失敗しました");
        return false;
      }
      toast.success(okMessage);
      await refetch();
      return true;
    } catch {
      toast.error("操作に失敗しました");
      return false;
    } finally {
      setPendingId(null);
    }
  };

  /** 借りる（受取）: isRenting 0|1 → 2 */
  const borrow = (reserveId: number) =>
    patchRenting(reserveId, 2, "貸し出しを開始しました");

  /** 返却: isRenting 2|3 → 4 */
  const giveBack = (reserveId: number) =>
    patchRenting(reserveId, 4, "返却しました");

  /** 予約キャンセル（削除）。貸出中のものはサーバー側でも拒否される。 */
  const cancel = async (reserveId: number): Promise<boolean> => {
    setPendingId(reserveId);
    try {
      const res = await fetch(`/api/reserves/${reserveId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "キャンセルに失敗しました");
        return false;
      }
      toast.success("予約をキャンセルしました");
      await refetch();
      return true;
    } catch {
      toast.error("キャンセルに失敗しました");
      return false;
    } finally {
      setPendingId(null);
    }
  };

  return { pendingId, borrow, giveBack, cancel };
};
