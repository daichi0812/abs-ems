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
