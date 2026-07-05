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
      // 401/500 の非配列ボディでも render の .map がクラッシュしないよう空配列にフォールバック
      setCategories(Array.isArray(data) ? data : []);
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
