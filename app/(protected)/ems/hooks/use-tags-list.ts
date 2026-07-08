"use client";

import { useMemo } from "react";
import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";
import type { Tag as Tags } from "@/types/domain";

export interface UseTagsListOptions {
  /** id 昇順ソート（categories ページで使用）。デフォルト false */
  sortById?: boolean;
}

// カテゴリ一覧。/api/tags のキャッシュは use-categories / use-tags と共有される。
export const useTagsList = (options: UseTagsListOptions = {}) => {
  const { sortById = false } = options;
  const { data, isLoading, refetch } = useCachedEndpoint<Tags>("/api/tags");
  const tags = useMemo(
    () => (sortById ? [...data].sort((a, b) => a.id - b.id) : data),
    [data, sortById]
  );
  return { tags, isLoading, refetch };
};
