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
    const listsJson = await responseLists.json();
    // 予約側(:下)と防御水準を揃える。5xx時に {error} を .reduce してクラッシュするのを防ぐ。
    const reservesListsData: List[] = Array.isArray(listsJson) ? listsJson : [];

    const nameMap: { [key: number]: string } = reservesListsData.reduce((map, item) => {
      map[item.id] = item.name;
      return map;
    }, {} as { [key: number]: string });

    setIdToNameMap(nameMap);

    // サーバー側で user_id 絞り込み（従来はクライアントで .filter していた）。
    // userId 未確定時は ?user_id= となりサーバーは該当0件を返す（従来と同じ空表示）。
    const response = await fetch(`/api/reserves?user_id=${encodeURIComponent(userId ?? "")}`);
    const reservesData: Reserve[] = await response.json();
    setFilteredData(Array.isArray(reservesData) ? reservesData : []);
  };

  useEffect(() => {
    refetch();
  }, []);

  return { filteredData, idToNameMap, refetch };
};
