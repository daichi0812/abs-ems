"use client";

import { useMemo } from "react";
import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";
import type { Equipment } from "@/types/domain";

// 機材一覧。キャッシュはタブ切り替え（再マウント）時に前回データを即表示し、
// 裏で再取得する（use-cached-endpoint 参照）。
export const useEquipments = () => {
  const { data, isLoading, refetch } = useCachedEndpoint<Equipment>("/api/lists");
  // 共有キャッシュの配列を破壊しないよう、非破壊でソートする
  const equipments = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );
  return { equipments, isLoading, refetch };
};
