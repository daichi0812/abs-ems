"use client";

import axios from "axios";
import { useState } from "react";

export interface CreateResult {
  ok: boolean; // 全件成功したか
  conflict: boolean; // 409（期間重複）が起きたか
  createdCount: number;
  createdIds: number[]; // 予約を作成できた機材ID（部分成功時のカート整理に使う）
  conflictIds: number[]; // 期間重複で弾かれた機材ID（どれが競合したか案内に使う）
  errorMessage?: string; // 409以外の失敗で API が返した具体的メッセージ
}

// 選択した複数機材を同一期間で予約作成する。旧 use-bulk-reservation の submit を
// alert 依存・FormEvent 依存から切り離し、結果を戻り値で返す（呼び出し側が toast/画面遷移を制御）。
// user_id は API 側でセッションから導出されるため body には送らない。
// 機材ごとに個別 POST するため「一部だけ成功」があり得る。全体を失敗のように
// 伝えると成功分まで予約し直されて二重予約になるため、機材IDごとの結果を返す。
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

      const createdIds: number[] = [];
      const conflictIds: number[] = [];
      let errorMessage: string | undefined;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          createdIds.push(listIds[i]);
          return;
        }
        if (axios.isAxiosError(r.reason) && r.reason.response?.status === 409) {
          conflictIds.push(listIds[i]);
          return;
        }
        if (!errorMessage && axios.isAxiosError(r.reason)) {
          const body = r.reason.response?.data as { error?: string } | undefined;
          if (body?.error) errorMessage = body.error;
        }
      });

      return {
        ok: createdIds.length === listIds.length,
        conflict: conflictIds.length > 0,
        createdCount: createdIds.length,
        createdIds,
        conflictIds,
        errorMessage,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, createReservations };
};
