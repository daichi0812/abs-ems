"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import type { Tag as Tags } from "@/types/domain";

export const useTagsList = () => {
  const [tags, setTags] = useState<Tags[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = async () => {
    try {
      const response = await axios.get("/api/tags");
      const sortedTags = response.data.sort((a: Tags, b: Tags) => a.id - b.id);
      setTags(sortedTags);
    } catch (err) {
      console.error("カテゴリ一覧の取得に失敗しました", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { tags, isLoading, refetch };
};
