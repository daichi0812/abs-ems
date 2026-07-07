import { db } from "@/lib/db";

/**
 * 既定ワークスペース（既存の放送部）。migration
 * 20260707171315_add_workspaces_and_tenant_columns で作成される固定行で、
 * List/Reserve/Tag の workspace_id の DB デフォルトもこの id を指す。
 * 値を変える場合は schema.prisma の @default と migration も揃えること。
 */
export const DEFAULT_WORKSPACE_ID = "ws_abs_default";
export const DEFAULT_WORKSPACE_SLUG = "abs";

/**
 * ユーザーを既定ワークスペースへ所属させ、現在のワークスペースにする。
 * セルフサーブ作成・招待コード（P3）が入るまでは、新規ユーザーは全員
 * 従来どおり放送部のワークスペースに入る（既存の単一団体運用と同じ挙動）。
 * upsert なので二重呼び出しは無害。
 */
export async function joinDefaultWorkspace(userId: string): Promise<void> {
  await db.membership.upsert({
    where: {
      userId_workspaceId: { userId, workspaceId: DEFAULT_WORKSPACE_ID },
    },
    update: {},
    create: { userId, workspaceId: DEFAULT_WORKSPACE_ID },
  });
  await db.user.update({
    where: { id: userId },
    data: { lastWorkspaceId: DEFAULT_WORKSPACE_ID },
  });
}
