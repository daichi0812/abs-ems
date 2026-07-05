"use client";

import { useEffect, useState } from "react";
import type { Reserve } from "@/types/domain";

export const useReserves = () => {
  const [reserves, setReserves] = useState<Reserve[]>([]);

  const refetch = async () => {
    try {
      const response = await fetch("/api/reserves");
      const data = await response.json();
      // 401/500 の非配列ボディでも競合判定/描画がクラッシュしないよう空配列にフォールバック
      setReserves(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching reserves:", error);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { reserves, refetch };
};
