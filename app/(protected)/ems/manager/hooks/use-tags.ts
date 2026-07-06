"use client";

import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";

// manager ページでは API レスポンスの `id` を Select の value（string 必須）として
// 直接使うため string で扱う。`@/types/domain` の Tag (id: number) との整合は別タスクで対応予定。
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// /api/tags のキャッシュは use-categories / use-tags-list と共有される。
export const useTags = () => {
  const { data, isLoading, refetch } = useCachedEndpoint<Tag>("/api/tags");
  return { tags: data, categories: data, isLoading, refetch };
};
