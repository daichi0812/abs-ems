"use client";

import { useEffect, useState } from "react";
import type { Tag as Tags } from "@/types/domain";

export interface UseTagsListOptions {
  /** id 昇順ソート（categories ページで使用）。デフォルト false */
  sortById?: boolean;
}

export const useTagsList = (options: UseTagsListOptions = {}) => {
  const { sortById = false } = options;
  const [tags, setTags] = useState<Tags[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = async () => {
    try {
      const response = await fetch("/api/tags");
      const data: Tags[] = await response.json();
      const next = sortById ? [...data].sort((a, b) => a.id - b.id) : data;
      setTags(next);
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
