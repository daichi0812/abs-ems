"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export const useReservationNavigation = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const navigateToReserve = (id: number) => {
    setLoadingId(id);
    startTransition(() => {
      router.push("/ems/reserve/" + id);
    });
  };

  return { loadingId, isPending, navigateToReserve };
};
