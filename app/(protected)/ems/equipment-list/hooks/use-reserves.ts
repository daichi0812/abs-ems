"use client";

import { useEffect, useState } from "react";
import type { Reserve } from "@/types/domain";

export const useReserves = () => {
  const [reserves, setReserves] = useState<Reserve[]>([]);
  // 読み込み完了前に reserves=[] のまま空き判定すると「全件空いています」と
  // 誤表示されるため、呼び出し側がスケルトンを出せるようローディング状態を持つ。
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const refetch = async () => {
    try {
      const response = await fetch("/api/reserves");
      const data = await response.json();
      // 401/500 の非配列ボディでも競合判定/描画がクラッシュしないよう空配列にフォールバック
      setReserves(Array.isArray(data) ? data : []);
      setIsError(false);
    } catch (error) {
      // 失敗を握りつぶすと「全件空き」の誤表示が恒久化するため、エラーとして呼び出し側へ返す
      console.error("Error fetching reserves:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // PWA・放置タブからの復帰時に、古い空き状況のまま予約へ進んで
    // 確定時に初めて409で弾かれるのを防ぐため、表示復帰で再取得する。
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { reserves, isLoading, isError, refetch };
};
