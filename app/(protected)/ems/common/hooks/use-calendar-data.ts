"use client";

import { useMemo } from "react";
import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";
import { getTextColorForBackground } from "@/lib/calendar-event-rendering";

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

interface User {
  id: string;
  name: string;
}

interface List {
  id: number;
  name: string;
  detail: string;
  image: string;
  usable: boolean;
  tag_id: number;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Reserve {
  id: number;
  user_id: string;
  start: string;
  end: string;
  list_id: number;
  isRenting: number;
}

// 共有カレンダーのデータ。4エンドポイントは互いに独立なので並行取得され、
// /api/lists・/api/tags・/api/users のキャッシュは他画面のフックと共有される
// （タブを行き来しても再マウントで即表示→裏で再検証。use-cached-endpoint 参照）。
export const useCalendarData = () => {
  const users = useCachedEndpoint<User>("/api/users");
  const lists = useCachedEndpoint<List>("/api/lists");
  const tags = useCachedEndpoint<Tag>("/api/tags");
  // カレンダーは過去の予約履歴も表示するため、期間フィルタは付けない
  const reserves = useCachedEndpoint<Reserve>("/api/reserves");

  const allEvents = useMemo<CalendarEvent[]>(() => {
    // ユーザーIDをキーにして名前をマッピング
    const idToNameMap1: { [key: string]: string } = {};
    users.data.forEach((u) => {
      idToNameMap1[u.id] = u.name;
    });

    // IDをキーにして機材名と色をマッピング
    const idToNameMap2: { [key: string]: string } = {};
    const idTolistId: { [key: number]: number } = {};
    lists.data.forEach((item) => {
      idToNameMap2[item.id] = item.name;
      idTolistId[item.id] = item.tag_id;
    });

    const idToColorMap: { [key: string]: string } = {};
    tags.data.forEach((tag) => {
      idToColorMap[tag.id] = tag.color;
    });

    return reserves.data.map((item) => {
      // end は「利用最終日（inclusive）」をそのまま保持する。
      // 旧実装は FullCalendar の排他的 end 用に +1 日していたが、自作カレンダー
      // エンジン（lib/calendar）は inclusive-end 前提のため補正しない。
      const endDate = new Date(item.end);

      const backgroundColor = idToColorMap[idTolistId[item.list_id]] || "#3788D8";
      const textColor = getTextColorForBackground(backgroundColor);

      return {
        title: idToNameMap2[item.list_id],
        start: item.start,
        end: endDate,
        allDay: true,
        id: item.id,
        name: idToNameMap1[item.user_id],
        isRenting: item.isRenting,
        list_id: item.list_id,
        backgroundColor,
        borderColor: backgroundColor,
        textColor,
      };
    });
  }, [users.data, lists.data, tags.data, reserves.data]);

  const sources = [users, lists, tags, reserves];
  // 1本でも初回未完了ならスケルトン（キャッシュ表示中の裏再検証では false のまま）
  const isFetching = sources.some((s) => s.isLoading);
  // 全画面エラーは「初回ロードに失敗した」ときだけ。取得済み表示は維持する
  const isError = sources.some((s) => s.isError) && !sources.every((s) => s.hasLoaded);
  const refetch = async () => {
    await Promise.all(sources.map((s) => s.refetch()));
  };

  return { allEvents, isFetching, isError, refetch };
};
