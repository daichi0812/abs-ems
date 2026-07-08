import { WorkspaceRole } from "@prisma/client";

/**
 * 既定ワークスペース（既存の放送部）。migration
 * 20260707171315_add_workspaces_and_tenant_columns で作成される固定行で、
 * List/Reserve/Tag の workspace_id の DB デフォルトもこの id を指す。
 * 値を変える場合は schema.prisma の @default と migration も揃えること。
 *
 * 新規ユーザーの自動所属（joinDefaultWorkspace）は招待制への移行で廃止した。
 * 参加経路はセルフサーブ作成（POST /api/workspaces）と招待リンク
 * （actions/workspace.ts の acceptInvite）のみ。
 */
export const DEFAULT_WORKSPACE_ID = "ws_abs_default";
export const DEFAULT_WORKSPACE_SLUG = "abs";

/*
 * メンバー管理（ロール変更・除名）の権限ルール。OWNER 優位:
 *   - OWNER は誰に対しても操作でき、どのロールも付与できる
 *   - ADMIN は MEMBER/ADMIN に対してのみ操作でき、OWNER の付与・変更はできない
 *   - MEMBER は操作不可（そもそも requireWorkspaceManager で弾かれる）
 * 「最後の OWNER の降格・除名禁止」は件数を要するためルート側でガードする。
 */

/** actorRole が targetRole のメンバーを操作（ロール変更・除名）できるか。 */
export function canManageMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  if (actorRole === WorkspaceRole.OWNER) return true;
  if (actorRole === WorkspaceRole.ADMIN) return targetRole !== WorkspaceRole.OWNER;
  return false;
}

/** actorRole が newRole を付与できるか（OWNER の任命は OWNER のみ）。 */
export function canAssignRole(
  actorRole: WorkspaceRole,
  newRole: WorkspaceRole
): boolean {
  if (actorRole === WorkspaceRole.OWNER) return true;
  if (actorRole === WorkspaceRole.ADMIN) return newRole !== WorkspaceRole.OWNER;
  return false;
}
