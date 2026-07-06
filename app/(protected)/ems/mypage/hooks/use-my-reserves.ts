"use client";

import { useCallback, useEffect, useState } from "react";

export interface Reserve {
  id: number;
  user_id: string;
  start: Date;
  end: Date;
  list_id: number;
  isRenting: number; // 0:予約中, 1:貸出可, 2:貸出中, 3:滞納
}

export interface UseMyReservesParams {
  userId: string | undefined;
}

// 自分の予約一覧の取得。機材名の解決は useEquipments 側が担うため、ここでは予約だけを取る。
// 以前は /api/lists → /api/reserves の直列2往復（しかも lists は useEquipments と二重取得）で、
// スケルトンが消えたあとに「予約はまだありません。」が一瞬誤表示される原因になっていた。
export const useMyReserves = ({ userId }: UseMyReservesParams) => {
  const [filteredData, setFilteredData] = useState<Reserve[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = useCallback(async () => {
    try {
      // サーバー側で user_id 絞り込み（従来はクライアントで .filter していた）。
      // userId 未確定時は ?user_id= となりサーバーは該当0件を返す（従来と同じ空表示）。
      const response = await fetch(`/api/reserves?user_id=${encodeURIComponent(userId ?? "")}`);
      const reservesData: Reserve[] = await response.json();
      setFilteredData(Array.isArray(reservesData) ? reservesData : []);
      setIsError(false);
    } catch (error) {
      // 失敗を握りつぶすと「予約はまだありません。」の誤表示で固まるため、エラーとして返す
      console.error("Error fetching my reserves:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // userId がマウント後に確定するケースでも取り直せるよう refetch(=userId) に依存させる
    refetch();
  }, [refetch]);

  return { filteredData, isLoading, isError, refetch };
};
