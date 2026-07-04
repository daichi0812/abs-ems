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
}

const DEFAULT_COLOR = "#3788D8";

export const useCalendarEvents = ({
  filteredData,
  idToNameMap,
  listColorMap,
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

    if (Object.keys(listColorMap).length > 0) {
      createEvents();
    }
  }, [filteredData, idToNameMap, listColorMap]);

  return { allEvents, setAllEvents, isFetching };
};
