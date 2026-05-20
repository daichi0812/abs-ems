"use client";

import { useEffect, useState } from "react";
import type { Reserve } from "@/types/domain";

export const useReserves = () => {
  const [reserves, setReserves] = useState<Reserve[]>([]);

  const refetch = async () => {
    try {
      const response = await fetch("/api/reserves");
      const data: Reserve[] = await response.json();
      setReserves(data);
    } catch (error) {
      console.error("Error fetching reserves:", error);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { reserves, refetch };
};
