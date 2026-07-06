"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAndCache, getCachedData } from "@/lib/client-cache";
import { getTextColorForBackground } from "@/lib/calendar-event-rendering";
import { dayIndexToDateString } from "@/lib/calendar/date-grid";

export interface CalendarEvent {
  textColor: string;
  isRenting: number;
  name: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  id: number;
  list_id: number;
  backgroundColor?: string;
  borderColor?: string;
}

// /api/calendar のレスポンス（4テーブルを1リクエストに集約。route.ts 参照）
interface CalendarPayload {
  users: { id: string; name: string | null }[];
  lists: { id: number; name: string | null; tag_id: number | null }[];
  tags: { id: number; name: string | null; color: string }[];
  reserves: {
    id: number;
    user_id: string | null;
    start: string;
    end: string;
    list_id: number | null;
    isRenting: number | null;
  }[];
}

export function calendarWindowUrl(fromIdx: number, toIdx: number): string {
  return `/api/calendar?from=${dayIndexToDateString(fromIdx)}&to=${dayIndexToDateString(toIdx)}`;
}

async function fetchCalendarPayload(url: string): Promise<CalendarPayload> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const json = await res.json();
  // 401/500 の {error} ボディ等を「正常な空」としてキャッシュすると誤った
  // 空カレンダーがタブ全体に伝播するため、形が違えばエラー扱いにする
  if (!json || typeof json !== "object" || !Array.isArray((json as { reserves?: unknown }).reserves)) {
    throw new Error(`unexpected response shape for ${url}`);
  }
  return json as CalendarPayload;
}

/**
 * 次に表示しそうな窓（前後の月など）を裏で温める。キャッシュ済みなら何もしない。
 * 失敗は握りつぶす（実際に表示された時に通常経路で取り直されるため）。
 */
export function prefetchCalendarWindow(fromIdx: number, toIdx: number): void {
  const url = calendarWindowUrl(fromIdx, toIdx);
  if (getCachedData<CalendarPayload>(url) !== undefined) return;
  void fetchAndCache(url, () => fetchCalendarPayload(url)).catch(() => {});
}

// 共有カレンダーのデータ。表示中の窓（fromIdx..toIdx、JST day index・inclusive)だけを
// /api/calendar から1リクエストで取得する。
//
// 旧実装は /api/users・/api/lists・/api/tags・/api/reserves を4本並行で叩き、しかも
// reserves は全履歴を無条件に取得していた（Workers では HTTPリクエスト=Neon接続なので
// 初回表示のたびに接続ハンドシェイク×4。履歴が増えるほど転送・描画も線形に重くなる）。
//
// 窓が変わったとき（月送り・ガント週送り）は、前の窓のデータを表示したまま裏で取得して
// 差し替える（スケルトンへ戻すと月送りのたびに画面が消えて操作感が悪い）。
// 取得済み窓はタブを閉じるまで client-cache に残るため、再訪問は即表示→裏で再検証になる。
export const useCalendarData = (fromIdx: number, toIdx: number) => {
  const url = calendarWindowUrl(fromIdx, toIdx);

  // state.url は「いま画面に反映されているデータがどの窓のものか」。表示中の url と
  // 異なる間は isWindowLoading（前の窓を見せながら裏で取得中）になる。
  const [state, setState] = useState<{ url: string; payload: CalendarPayload } | null>(() => {
    const cached = getCachedData<CalendarPayload>(url);
    return cached === undefined ? null : { url, payload: cached };
  });
  const [isError, setIsError] = useState(false);
  const urlRef = useRef(url);
  // このフックが画面へ反映した最新のリクエスト世代。古い応答の後着を弾く
  const appliedTicketRef = useRef(0);

  const runFetch = useCallback(
    async (force: boolean) => {
      try {
        const { data, ticket } = await fetchAndCache<CalendarPayload>(
          url,
          () => fetchCalendarPayload(url),
          { force }
        );
        // 応答待ちの間に窓が切り替わっていたら反映しない（古い応答の上書き防止）
        if (urlRef.current !== url) return;
        if (ticket < appliedTicketRef.current) return;
        appliedTicketRef.current = ticket;
        setState({ url, payload: data });
        setIsError(false);
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        if (urlRef.current !== url) return;
        setIsError(true);
      }
    },
    [url]
  );

  useEffect(() => {
    urlRef.current = url;
    // 窓が変わったらキャッシュがあれば即反映。無ければ前の窓を表示したまま取得を待つ
    const cached = getCachedData<CalendarPayload>(url);
    if (cached !== undefined) {
      setState({ url, payload: cached });
    }
    setIsError(false);
    // キャッシュがあっても裏で必ず再検証する（stale-while-revalidate）。
    // マウント時の再検証は force しない＝同一URLの同時リクエストは1本にまとまる
    void runFetch(false);
  }, [url, runFetch]);

  const payload = state?.payload ?? null;

  const allEvents = useMemo<CalendarEvent[]>(() => {
    if (!payload) return [];

    // ユーザーIDをキーにして名前をマッピング
    const idToNameMap1: { [key: string]: string } = {};
    payload.users.forEach((u) => {
      if (u.name != null) idToNameMap1[u.id] = u.name;
    });

    // IDをキーにして機材名と色をマッピング
    const idToNameMap2: { [key: string]: string } = {};
    const idTolistId: { [key: number]: number } = {};
    payload.lists.forEach((item) => {
      if (item.name != null) idToNameMap2[item.id] = item.name;
      if (item.tag_id != null) idTolistId[item.id] = item.tag_id;
    });

    const idToColorMap: { [key: string]: string } = {};
    payload.tags.forEach((tag) => {
      idToColorMap[tag.id] = tag.color;
    });

    return payload.reserves.map((item) => {
      // end は「利用最終日（inclusive）」をそのまま保持する。
      // 旧実装は FullCalendar の排他的 end 用に +1 日していたが、自作カレンダー
      // エンジン（lib/calendar）は inclusive-end 前提のため補正しない。
      const endDate = new Date(item.end);

      const backgroundColor =
        (item.list_id != null && idToColorMap[idTolistId[item.list_id]]) || "#3788D8";
      const textColor = getTextColorForBackground(backgroundColor);

      return {
        title: item.list_id != null ? idToNameMap2[item.list_id] : "",
        start: item.start,
        end: endDate,
        allDay: true,
        id: item.id,
        name: item.user_id != null ? idToNameMap1[item.user_id] : "",
        isRenting: item.isRenting ?? 0,
        list_id: item.list_id ?? 0,
        backgroundColor,
        borderColor: backgroundColor,
        textColor,
      };
    });
  }, [payload]);

  // 1度も何も表示できていない取得中だけスケルトン（窓の切り替え中は前の窓を出し続ける）
  const isFetching = payload === null && !isError;
  // 全画面エラーは「表示できるデータが何も無い」ときだけ
  const isErrorExposed = payload === null && isError;
  // 前の窓を表示したまま、いまの窓を取得している
  const isWindowLoading = state !== null && state.url !== url && !isError;
  // 前の窓を表示したまま、いまの窓の取得に失敗した（インライン再試行の出し分け用）
  const isWindowError = state !== null && state.url !== url && isError;

  const refetch = useCallback(() => runFetch(true), [runFetch]);

  return {
    allEvents,
    isFetching,
    isError: isErrorExposed,
    isWindowLoading,
    isWindowError,
    refetch,
  };
};
