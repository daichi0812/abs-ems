"use client";

import { useEffect, useState } from "react";

export interface Reserve {
  id: number;
  user_id: string;
  start: Date;
  end: Date;
  list_id: number;
  isRenting: number; // 0:予約中, 1:貸出可, 2:貸出中, 3:滞納
}

interface List {
  id: number;
  name: string;
  detail: string;
  image: string;
  usable: boolean;
}

export interface UseMyReservesParams {
  userId: string | undefined;
}

export const useMyReserves = ({ userId }: UseMyReservesParams) => {
  const [filteredData, setFilteredData] = useState<Reserve[]>([]);
  const [idToNameMap, setIdToNameMap] = useState<{ [key: number]: string }>({});

  const refetch = async () => {
    const responseLists = await fetch("/api/lists");
    const reservesListsData: List[] = await responseLists.json();

    const nameMap: { [key: number]: string } = reservesListsData.reduce((map, item) => {
      map[item.id] = item.name;
      return map;
    }, {} as { [key: number]: string });

    setIdToNameMap(nameMap);

    const response = await fetch("/api/reserves");
    const reservesData: Reserve[] = await response.json();
    setFilteredData(reservesData.filter((item) => item.user_id == userId));
  };

  useEffect(() => {
    refetch();
  }, []);

  return { filteredData, idToNameMap, refetch };
};
