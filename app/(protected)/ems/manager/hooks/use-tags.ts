"use client";

import { useEffect, useState } from "react";

// manager ページでは API レスポンスの `id` を Select の value（string 必須）として
// 直接使うため string で扱う。`@/types/domain` の Tag (id: number) との整合は別タスクで対応予定。
export interface Tag {
  id: string;
  name: string;
  color: string;
}

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();
      setTags(data);
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { tags, categories, isLoading, refetch };
};
