// クライアント側の素朴な stale-while-revalidate キャッシュ。
//
// 以前は全フックが「マウント時に素の fetch」だったため、ヘッダーのタブを
// 行き来するたびに同じマスタデータを取り直してスケルトンに戻っていた。
// SWR / TanStack Query を入れるほどの規模ではないので、モジュールスコープの
// Map で次の2つだけを担う:
//   1. 再訪時（再マウント時）は前回データを即表示し、裏で再取得して差し替える
//   2. 同一キーへの同時リクエストを1本にまとめる（重複排除）
// キャッシュはタブを閉じるまで残るが、マウントごとに必ず再検証されるので
// 古いデータが表示され続けることはない。

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function getCachedData<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export async function fetchAndCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const data = await fetcher();
      cache.set(key, data);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/** テスト用: モジュールスコープのキャッシュと進行中リクエストを破棄する */
export function clearClientCache() {
  cache.clear();
  inflight.clear();
}
