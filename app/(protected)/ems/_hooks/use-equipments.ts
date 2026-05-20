"use client";

import { useEffect, useState } from "react";
import type { Equipment } from "@/types/domain";

export const useEquipments = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = async () => {
    const response = await fetch("/api/lists");
    const data: Equipment[] = await response.json();
    const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
    setEquipments(sortedData);
    setIsLoading(false);
  };

  useEffect(() => {
    refetch();
  }, []);

  return { equipments, isLoading, refetch };
};
