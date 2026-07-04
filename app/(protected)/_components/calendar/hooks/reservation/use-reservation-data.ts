"use client";

import { useEffect, useState } from "react";

export interface ReservationEvent {
  title: string | undefined;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  id: number;
}

export interface Reserve {
  id: number;
  user_id: string;
  start: string;
  end: string;
  list_id: number;
}

interface UserApiItem {
  id: string | number;
  name: string;
}

export interface UseReservationDataParams {
  listId: number;
}

export const useReservationData = ({ listId }: UseReservationDataParams) => {
  const [allEvents, setAllEvents] = useState<ReservationEvent[]>([]);
  const [filteredData, setFilteredData] = useState<Reserve[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  const fetchReservesData = async () => {
    const key = process.env.NEXT_PUBLIC_API_KEY as string;

    const usersResponse = await fetch(`/api/users?key=${encodeURIComponent(key)}`);
    if (!usersResponse.ok) {
      console.error("Failed to fetch users: ", usersResponse.status);
      return;
    }

    const reservesListsData: UserApiItem[] = await usersResponse.json();

    const idToNameMap: { [key: string]: string } = reservesListsData.reduce(
      (map: { [x: string]: string }, item) => {
        map[item.id] = item.name;
        return map;
      },
      {} as { [key: string]: string },
    );

    const response = await fetch("/api/reserves");
    const reservesData: Reserve[] = await response.json();
    const filtered = reservesData.filter((item) => item.list_id == listId);

    setFilteredData(filtered);

    const newEvents = filtered.map((item) => {
      const endDate = new Date(item.end);
      endDate.setDate(endDate.getDate() + 1);

      return {
        title: idToNameMap[item.user_id],
        start: item.start,
        end: endDate,
        allDay: true,
        id: item.id,
      };
    });

    setAllEvents(newEvents);
    setIsFetching(false);
  };

  useEffect(() => {
    fetchReservesData();
  }, []);

  return { allEvents, setAllEvents, filteredData, isFetching, refetch: fetchReservesData };
};
