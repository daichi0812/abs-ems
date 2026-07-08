"use client";

import type { WorkspaceRole } from "@prisma/client";
import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";

export interface MyWorkspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}

/** 自分の所属ワークスペース一覧（ヘッダーのスイッチャー・設定ページ用）。 */
export function useMyWorkspaces() {
  const { data: workspaces, isLoading, refetch } = useCachedEndpoint<MyWorkspace>("/api/workspaces");
  return { workspaces, isLoading, refetch };
}
