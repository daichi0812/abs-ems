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
// - マウント時の再検証は同一 URL で1本にまとまる（lib/client-cache の重複排除）
// - 公開している refetch は「変更直後の再取得」用なので、進行中のリクエストに
//   相乗りせず必ず新規発行する（変更前のスナップショットを掴まないため）
// - エラー応答（非配列ボディ・HTTPエラー）はキャッシュせず isError 経路に乗せる
export function useCachedEndpoint<T>(url: string): CachedEndpointResult<T> {
  const initialCached = getCachedData<T[]>(url);
  const [data, setData] = useState<T[]>(initialCached ?? []);
  const [isLoading, setIsLoading] = useState(initialCached === undefined);
  const [isError, setIsError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(initialCached !== undefined);
  const hasLoadedRef = useRef(initialCached !== undefined);
  const urlRef = useRef(url);
  // このフックが画面へ反映した最新のリクエスト世代。古い応答の後着を弾く
  const appliedTicketRef = useRef(0);

  const runFetch = useCallback(
    async (force: boolean) => {
      // 初回（および初回失敗後の再試行）はスケルトンに戻して「押しても無反応」に見えないようにする
      if (!hasLoadedRef.current) setIsLoading(true);
      try {
        const { data: fresh, ticket } = await fetchAndCache<T[]>(
          url,
          async () => {
            const res = await fetch(url);
            if (res.ok === false) {
              throw new Error(`HTTP ${res.status} for ${url}`);
            }
            const json = await res.json();
            if (!Array.isArray(json)) {
              // 401/500 の {error} ボディ等。空配列として「正常」扱いでキャッシュすると
              // 誤った空表示がタブ全体に伝播するため、エラーとして扱う
              throw new Error(`unexpected non-array response for ${url}`);
            }
            return json as T[];
          },
          { force }
        );
        // 応答待ちの間に URL が切り替わっていたら反映しない
        // （旧URLの遅い応答が新URLの表示を上書きするレースを防ぐ）
        if (urlRef.current !== url) return;
        // より新しいリクエストの結果を既に反映済みなら、古い応答は捨てる
        if (ticket < appliedTicketRef.current) return;
        appliedTicketRef.current = ticket;
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
    },
    [url]
  );

  // 変更直後の再取得・再試行ボタン用。進行中のリクエストに相乗りしない
  const refetch = useCallback(() => runFetch(true), [runFetch]);

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
    // キャッシュがあっても裏で必ず再検証する（stale-while-revalidate）。
    // マウント時の再検証は force しない＝同一URLの同時マウントで1本にまとまる
    void runFetch(false);
  }, [url, runFetch]);

  return { data, isLoading, isError, hasLoaded, refetch };
}
