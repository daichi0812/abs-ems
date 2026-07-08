"use client";

import type { WorkspaceRole } from "@prisma/client";
import { useCachedEndpoint } from "@/hooks/use-cached-endpoint";

export interface WorkspaceMember {
  userId: string;
  name: string | null;
  image: string | null;
  role: WorkspaceRole;
  createdAt: string;
}

/**
 * 現在のワークスペースのメンバー一覧（設定ページのメンバー管理用）。
 * API は管理者（OWNER/ADMIN）専用なので、管理者 UI からのみ呼ぶこと。
 */
export function useWorkspaceMembers() {
  const { data: members, isLoading, isError, refetch } =
    useCachedEndpoint<WorkspaceMember>("/api/workspaces/current/members");
  return { members, isLoading, isError, refetch };
}
