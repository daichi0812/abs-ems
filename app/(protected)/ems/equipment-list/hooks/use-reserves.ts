"use client";

import { useEffect, useMemo } from "react";
import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";
import { dayIndexToDateString, todayJstDayIndex } from "@/lib/calendar/date-grid";
import type { Reserve } from "@/types/domain";

// 予約ウィザード用の予約一覧。
// 空き判定に過去の予約は不要なので「今日(JST)以降に掛かる予約」だけを取得する。
// 予約データは返却済みも消えずに溜まり続けるため、全件取得だと年々遅くなる。
export const useReserves = () => {
  const url = useMemo(
    () => `/api/reserves?from=${dayIndexToDateString(todayJstDayIndex())}`,
    []
  );
  const {
    data: reserves,
    isLoading,
    isError,
    hasLoaded,
    refetch,
  } = useCachedEndpoint<Reserve>(url);

  useEffect(() => {
    // PWA・放置タブからの復帰時に、古い空き状況のまま予約へ進んで
    // 確定時に初めて409で弾かれるのを防ぐため、表示復帰で再取得する。
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  return { reserves, isLoading, isError, hasLoaded, refetch };
};
