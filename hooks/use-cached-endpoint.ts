"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAndCache, getCachedData } from "@/lib/client-cache";

export interface CachedEndpointResult<T> {
  data: T[];
  /** データが一度も無い状態での取得中（スケルトン表示用）。キャッシュがあれば false のまま */
  isLoading: boolean;
  isError: boolean;
  /** 一度でも取得（またはキャッシュ表示）に成功したか。全画面エラーの出し分けに使う */
  hasLoaded: boolean;
  refetch: () => Promise<void>;
}

// 配列を返す社内 API 用の stale-while-revalidate フック。
// - 初回: fetch 完了まで isLoading（スケルトン）
// - 再マウント（タブ切り替え等）: キャッシュを即表示し、裏で再取得して差し替え
// - 同一 URL への同時リクエストは lib/client-cache 側で1本にまとまる
// - 非配列ボディ（401/500 の {error}）は空配列へフォールバック（呼び出し側の .map を守る）
export function useCachedEndpoint<T>(url: string): CachedEndpointResult<T> {
  const initialCached = getCachedData<T[]>(url);
  const [data, setData] = useState<T[]>(initialCached ?? []);
  const [isLoading, setIsLoading] = useState(initialCached === undefined);
  const [isError, setIsError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(initialCached !== undefined);
  const hasLoadedRef = useRef(initialCached !== undefined);
  const urlRef = useRef(url);

  const refetch = useCallback(async () => {
    // 初回（および初回失敗後の再試行）はスケルトンに戻して「押しても無反応」に見えないようにする
    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const fresh = await fetchAndCache<T[]>(url, async () => {
        const res = await fetch(url);
        const json = await res.json();
        return Array.isArray(json) ? (json as T[]) : [];
      });
      // 応答待ちの間に URL が切り替わっていたら反映しない
      // （旧URLの遅い応答が新URLの表示を上書きするレースを防ぐ。キャッシュには保存済み）
      if (urlRef.current !== url) return;
      setData(fresh);
      setIsError(false);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch (error) {
      // 失敗を握りつぶすと空データの誤表示が恒久化するため、エラーとして呼び出し側へ返す
      console.error(`Error fetching ${url}:`, error);
      if (urlRef.current !== url) return;
      setIsError(true);
    } finally {
      if (urlRef.current === url) setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // URL が変わったら（例: userId 確定でクエリが変わる）別リソースなので状態を組み直す。
    // 旧 URL のデータを「読み込み済み」として見せると偽の空表示につながる。
    if (urlRef.current !== url) {
      urlRef.current = url;
      const cached = getCachedData<T[]>(url);
      hasLoadedRef.current = cached !== undefined;
      setHasLoaded(cached !== undefined);
      setData(cached ?? []);
      setIsError(false);
      if (cached === undefined) setIsLoading(true);
    }
    // キャッシュがあっても裏で必ず再検証する（stale-while-revalidate）
    refetch();
  }, [url, refetch]);

  return { data, isLoading, isError, hasLoaded, refetch };
}
