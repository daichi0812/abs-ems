"use client";

import axios from "axios";
import { useState } from "react";

export interface CreateResult {
  ok: boolean; // 全件成功したか
  conflict: boolean; // 409（期間重複）が起きたか
  createdCount: number;
}

// 選択した複数機材を同一期間で予約作成する。旧 use-bulk-reservation の submit を
// alert 依存・FormEvent 依存から切り離し、結果を戻り値で返す（呼び出し側が toast/画面遷移を制御）。
// user_id は API 側でセッションから導出されるため body には送らない。
export const useCreateReservations = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createReservations = async (
    listIds: number[],
    start: string,
    end: string
  ): Promise<CreateResult> => {
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        listIds.map((list_id) => axios.post("/api/reserves", { list_id, start, end }))
      );

      const createdCount = results.filter((r) => r.status === "fulfilled").length;
      const conflict = results.some(
        (r) =>
          r.status === "rejected" &&
          axios.isAxiosError(r.reason) &&
          r.reason.response?.status === 409
      );

      return { ok: createdCount === listIds.length, conflict, createdCount };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, createReservations };
};
