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
    // listId が非数値（不正な equipmentId 経由）なら、従来同様「空カレンダー」で無害に終える。
    // サーバーの ?list_id= は不正値に 400 を返すため、無効な listId では fetch しない（クラッシュ防止）。
    if (!Number.isInteger(listId)) {
      setFilteredData([]);
      setAllEvents([]);
      setIsFetching(false);
      return;
    }

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

    // サーバー側で list_id 絞り込み（従来はクライアントで .filter していた）。
    const response = await fetch(`/api/reserves?list_id=${listId}`);
    const reservesData: Reserve[] = await response.json();
    const filtered = Array.isArray(reservesData) ? reservesData : [];

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
