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

interface InflightEntry {
  promise: Promise<{ data: unknown; ticket: number }>;
  ticket: number;
}
const inflight = new Map<string, InflightEntry>();

// リクエストの世代番号。「古いリクエストの遅い応答」が新しい結果を
// 上書きしないよう、キャッシュへの書き込みは ticket の新しい順を保証する。
let seq = 0;
const lastWrittenTicket = new Map<string, number>();

export function getCachedData<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export interface FetchAndCacheOptions {
  /**
   * 進行中の同一キーのリクエストに相乗りせず、必ず新規リクエストを発行する。
   * 予約作成・返却・並べ替えなど「変更した直後の再取得」で使う。
   * 相乗りすると、変更前にサーバーへ届いた GET の結果（変更前のスナップショット）を
   * 受け取ってしまい、変更が巻き戻ったように見える。
   */
  force?: boolean;
}

export async function fetchAndCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchAndCacheOptions = {}
): Promise<{ data: T; ticket: number }> {
  if (!options.force) {
    const pending = inflight.get(key);
    if (pending) return pending.promise as Promise<{ data: T; ticket: number }>;
  }

  const ticket = ++seq;
  const promise = (async () => {
    try {
      const data = await fetcher();
      // 自分より新しいリクエストが書き込み済みなら、古い応答で上書きしない
      if ((lastWrittenTicket.get(key) ?? 0) < ticket) {
        cache.set(key, data);
        lastWrittenTicket.set(key, ticket);
      }
      return { data, ticket };
    } finally {
      if (inflight.get(key)?.ticket === ticket) inflight.delete(key);
    }
  })();
  inflight.set(key, { promise, ticket });
  return promise;
}

/** テスト用: モジュールスコープのキャッシュと進行中リクエストを破棄する */
export function clearClientCache() {
  cache.clear();
  inflight.clear();
  lastWrittenTicket.clear();
}
