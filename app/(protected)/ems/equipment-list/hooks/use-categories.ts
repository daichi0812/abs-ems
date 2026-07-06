"use client";

import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";

// equipment-list ページでは category.id を Select の value（string 必須）に直接渡しているため、
// ここでは string として扱う。`@/types/domain` の Tag (id: number) との整合は別タスクで対応予定。
export interface Category {
  id: string;
  name: string;
  color: string;
}

// /api/tags のキャッシュは use-tags-list / use-tags と共有される。
export const useCategories = () => {
  const { data: categories, isLoading, refetch } = useCachedEndpoint<Category>("/api/tags");
  return { categories, isLoading, refetch };
};
