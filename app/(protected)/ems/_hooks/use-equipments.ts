"use client";

import { useEffect, useState } from "react";
import type { Equipment } from "@/types/domain";

export const useEquipments = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = async () => {
    try {
      const response = await fetch("/api/lists");
      const data = await response.json();
      // 非配列ボディ(401/500)でも .sort が例外を投げて無限スピナーにならないよう空配列に。
      const list: Equipment[] = Array.isArray(data) ? data : [];
      const sortedData = [...list].sort((a, b) => a.name.localeCompare(b.name));
      setEquipments(sortedData);
    } catch (error) {
      console.error("Error fetching equipments:", error);
    } finally {
      // fetch/json が例外でも必ずスピナーを解除する
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { equipments, isLoading, refetch };
};
