import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { hasManagerAccess } from "@/lib/api-auth";
import { isDeveloperEmail } from "@/lib/dev-auth";

type SessionUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

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
