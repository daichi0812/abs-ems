"use client";

import { useEffect, useState } from "react";

interface List {
  id: number;
  name: string;
  tag: {
    color: string;
  };
}

const DEFAULT_COLOR = "#3788D8";

export const useListColorMap = () => {
  const [listColorMap, setListColorMap] = useState<{ [key: number]: string }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchListData = async () => {
      try {
        const response = await fetch("/api/lists");
        const listData: List[] = await response.json();
        const colorMap: { [key: number]: string } = {};
        listData.forEach((list) => {
          colorMap[list.id] = list.tag?.color || DEFAULT_COLOR;
        });
        setListColorMap(colorMap);
      } catch (error) {
        console.error("Error fetching list data:", error);
      } finally {
        // 失敗・空データでもローディングを終える（呼び出し側はデフォルト色で描画する）
        setIsLoading(false);
      }
    };

    fetchListData();
  }, []);

  return { listColorMap, isLoading };
};
