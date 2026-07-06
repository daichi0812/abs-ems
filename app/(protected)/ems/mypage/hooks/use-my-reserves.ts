"use client";

import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";

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

// 自分の予約一覧。機材名の解決は useEquipments 側が担うため、ここでは予約だけを取る。
// サーバー側で user_id 絞り込み（userId 未確定時は ?user_id= となりサーバーは該当0件を返す）。
// userId がマウント後に確定した場合は URL が変わり、use-cached-endpoint が取り直す。
export const useMyReserves = ({ userId }: UseMyReservesParams) => {
  const {
    data: filteredData,
    isLoading,
    isError,
    hasLoaded,
    refetch,
  } = useCachedEndpoint<Reserve>(`/api/reserves?user_id=${encodeURIComponent(userId ?? "")}`);

  return { filteredData, isLoading, isError, hasLoaded, refetch };
};
