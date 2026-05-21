"use client";

import { useRouter } from "next/navigation";
import type { CalendarEvent } from "./use-calendar-data";

export interface FullCalendarEventClick {
  event: { id: string };
}

export const useEventNavigation = (allEvents: CalendarEvent[]) => {
  const router = useRouter();

  const navigateToDetail = (data: FullCalendarEventClick) => {
    const event = allEvents.find((e) => e.id === Number(data.event.id));
    router.push(`/ems/reserve/${event?.list_id}`);
  };

  return { navigateToDetail };
};
