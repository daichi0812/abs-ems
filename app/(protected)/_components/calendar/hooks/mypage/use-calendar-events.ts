"use client";

import { useEffect, useState } from "react";
import { getTextColorForBackground } from "@/lib/calendar-event-rendering";

export interface MypageCalendarEvent {
  title: string;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  id: number;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

export interface Reserve {
  id: number;
  user_id: string;
  start: Date;
  end: Date;
  list_id: number;
  isRenting: number;
}

export interface UseCalendarEventsParams {
  filteredData: Reserve[];
  idToNameMap: { [key: number]: string };
  listColorMap: { [key: number]: string };
  isColorMapLoading: boolean;
}

const DEFAULT_COLOR = "#3788D8";

export const useCalendarEvents = ({
  filteredData,
  idToNameMap,
  listColorMap,
  isColorMapLoading,
}: UseCalendarEventsParams) => {
  const [allEvents, setAllEvents] = useState<MypageCalendarEvent[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  useEffect(() => {
    const createEvents = () => {
      const newEvents = filteredData.map((item) => {
        const endDate = new Date(item.end);
        endDate.setDate(endDate.getDate() + 1); // 一日追加

        const backgroundColor = listColorMap[item.list_id] || DEFAULT_COLOR;
        const textColor = getTextColorForBackground(backgroundColor);

        return {
          title: idToNameMap[item.list_id],
          start: item.start,
          end: endDate,
          allDay: true,
          id: item.id,
          backgroundColor,
          borderColor: backgroundColor,
          textColor,
        };
      });

      setAllEvents(newEvents);
      setIsFetching(false);
    };

    // 色マップの取得完了を待つ。取得失敗・空でも DEFAULT_COLOR で描画してローディングを終える
    if (!isColorMapLoading) {
      createEvents();
    }
  }, [filteredData, idToNameMap, listColorMap, isColorMapLoading]);

  return { allEvents, setAllEvents, isFetching };
};
