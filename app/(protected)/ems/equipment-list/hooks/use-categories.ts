"use client";

import { useEffect, useState } from "react";

// equipment-list ページでは category.id を Select の value（string 必須）に直接渡しているため、
// ここでは string として扱う。`@/types/domain` の Tag (id: number) との整合は別タスクで対応予定。
export interface Category {
  id: string;
  name: string;
  color: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();
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

  return { categories, isLoading, refetch };
};
