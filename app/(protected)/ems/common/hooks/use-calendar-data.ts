"use client";

import { useEffect, useState } from "react";
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

export const useCalendarData = () => {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchReservesData = async () => {
    setIsFetching(true);
    setIsError(false);
    try {
    // 4つのAPIは互いに独立なので並列取得する（従来は直列awaitでウォーターフォールになっていた）。
    // 各APIはログイン必須になり得るため、401/500 の非配列ボディでも .reduce/.map が
    // クラッシュしないよう Array.isArray で空配列にフォールバックする（他フックと同じ防御水準）。
    const [reservesListsData1, reservesListsData2, tags, reservesData] = await Promise.all([
      fetch("/api/users").then((res) => res.json()).then((d) => (Array.isArray(d) ? d : []) as User[]),
      fetch("/api/lists").then((res) => res.json()).then((d) => (Array.isArray(d) ? d : []) as List[]),
      fetch("/api/tags").then((res) => res.json()).then((d) => (Array.isArray(d) ? d : []) as Tag[]),
      fetch("/api/reserves").then((res) => res.json()).then((d) => (Array.isArray(d) ? d : []) as Reserve[]),
    ]);

    // ユーザーIDをキーにして名前をマッピング
    const idToNameMap1: { [key: string]: string } = reservesListsData1.reduce((map, item) => {
      map[item.id] = item.name;
      return map;
    }, {} as { [key: string]: string });

    // IDをキーにして機材名と色をマッピング
    const idToNameMap2: { [key: string]: string } = {};
    const idToColorMap: { [key: string]: string } = {};
    const idTolistId: { [key: number]: number } = {};

    reservesListsData2.forEach((item) => {
      idToNameMap2[item.id] = item.name;
      idTolistId[item.id] = item.tag_id;
    });

    tags.forEach((tag) => {
      idToColorMap[tag.id] = tag.color;
    });

    // 新しいイベントの一時配列を作成
    const newEvents: CalendarEvent[] = reservesData.map((item) => {
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

    setAllEvents(newEvents);
    } catch (error) {
      // 1本でも fetch が失敗すると以前は isFetching が下りず、無限スケルトンのまま
      // 固まっていた。エラーとして返し、呼び出し側で再試行できるようにする。
      console.error("Error fetching calendar data:", error);
      setIsError(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchReservesData();
  }, []);

  return { allEvents, isFetching, isError, refetch: fetchReservesData };
};
