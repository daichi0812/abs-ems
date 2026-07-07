import { NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { hasManagerAccess } from "@/lib/api-auth";
import { isDeveloperEmail } from "@/lib/dev-auth";
import { db } from "@/lib/db";

type SessionUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export interface WorkspaceContext {
  user: SessionUser;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
}

/**
 * API route 共通の認証・認可ガード。
 *
 * 各 route に散在していた「currentUser()→401」「hasManagerAccess()→403」
 * 「isDeveloperEmail()→403」のボイラープレートを1箇所へ集約する。
 * 認証(未ログイン)=401 / 認可(権限不足)=403 の使い分けはここで統一する。
 *
 * 使い方（早期リターン）:
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth はログイン済みユーザー
 */

/** ログイン必須。未認証なら 401 レスポンス、認証済みならセッションユーザーを返す。 */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "認証されていません。" }, { status: 401 });
  }
  return user;
}

/**
 * 管理系（機材・タグの変更）操作のガード。権限があれば null、無ければ 403 レスポンスを返す。
 *   const denied = await requireManager(request);
 *   if (denied) return denied;
 */
export async function requireManager(
  request: Request
): Promise<NextResponse | null> {
  if (!(await hasManagerAccess(request))) {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  return null;
}

/**
 * ワークスペース単位のデータ（機材・タグ・予約・カレンダー）を扱う API のガード。
 * 未認証は 401、所属なしは 403、通れば { user, workspaceId, workspaceRole } を返す。
 *
 * JWT の currentWorkspaceId は最大15分古い（lib/jwt-refresh.ts の再照会間隔）ため、
 * ここで membership を毎回 DB 再検証する。除名直後のユーザーが古い JWT で
 * 他ワークスペースのデータへ届くことはない（読み書きとも）。
 * unique index 1発の軽い照会で、リクエスト内の既存接続（lib/db.ts）に乗る。
 *
 *   const ctx = await requireWorkspaceMember();
 *   if (ctx instanceof NextResponse) return ctx;
 *   ... where: { workspaceId: ctx.workspaceId, ... }
 */
export async function requireWorkspaceMember(): Promise<WorkspaceContext | NextResponse> {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  // 通常は JWT から。P2 デプロイ前に発行された古い JWT には載っていないため、
  // その間（最大15分）は lastWorkspaceId → 最初の所属 の順で DB から解決する。
  let workspaceId = auth.currentWorkspaceId ?? null;
  if (!workspaceId) {
    const user = await db.user.findUnique({
      where: { id: auth.id },
      select: { lastWorkspaceId: true },
    });
    workspaceId = user?.lastWorkspaceId ?? null;
  }
  if (!workspaceId) {
    const first = await db.membership.findFirst({
      where: { userId: auth.id },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });
    workspaceId = first?.workspaceId ?? null;
  }
  if (!workspaceId) {
    return NextResponse.json({ error: "ワークスペースに所属していません。" }, { status: 403 });
  }

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: auth.id!, workspaceId } },
    select: { role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "ワークスペースに所属していません。" }, { status: 403 });
  }

  return { user: auth, workspaceId, workspaceRole: membership.role };
}

/**
 * ワークスペース内の管理操作（機材・タグの変更、他人予約の操作）のガード。
 * Membership.role が OWNER/ADMIN なら許可。移行期は従来の hasManagerAccess
 * （グローバル ADMIN / NEXT_PUBLIC_MANAGER_KEY）も OR で許可する
 * （権限を Membership.role へ一本化した時点でフォールバックを撤去する）。
 */
export async function requireWorkspaceManager(
  request: Request
): Promise<WorkspaceContext | NextResponse> {
  const ctx = await requireWorkspaceMember();
  if (ctx instanceof NextResponse) return ctx;

  const isWorkspaceManager =
    ctx.workspaceRole === WorkspaceRole.OWNER ||
    ctx.workspaceRole === WorkspaceRole.ADMIN;
  if (!isWorkspaceManager && !(await hasManagerAccess(request))) {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  return ctx;
}

/**
 * 開発者専用（フィードバック閲覧など）のガード。
 * 未認証は 401、開発者でなければ 403、通れば当人のユーザーを返す。
 */
export async function requireDeveloper(): Promise<SessionUser | NextResponse> {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  if (!isDeveloperEmail(auth.email)) {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  return auth;
}
