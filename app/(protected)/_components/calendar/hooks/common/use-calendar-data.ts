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

  const fetchReservesData = async () => {
    // 4つのAPIは互いに独立なので並列取得する（従来は直列awaitでウォーターフォールになっていた）
    const [reservesListsData1, reservesListsData2, tags, reservesData] = await Promise.all([
      fetch("/api/users").then((res) => res.json() as Promise<User[]>),
      fetch("/api/lists").then((res) => res.json() as Promise<List[]>),
      fetch("/api/tags").then((res) => res.json() as Promise<Tag[]>),
      fetch("/api/reserves").then((res) => res.json() as Promise<Reserve[]>),
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
      const endDate = new Date(item.end);
      endDate.setDate(endDate.getDate() + 1);

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
    setIsFetching(false);
  };

  useEffect(() => {
    fetchReservesData();
  }, []);

  return { allEvents, isFetching };
};
