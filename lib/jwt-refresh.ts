import { getUserById } from "@/data/user";
import { getAccountByUserId } from "@/data/account";

// jwt コールバック本体。auth.ts から分離してあるのは、NextAuth の初期化なしに
// 単体テストできるようにするため。
//
// DB 照会の方針:
// - サインイン直後（user あり）と useSession().update() 実行時（trigger === "update"）は必ず照会
//   ※ update() は「引数なし」だと GET になり trigger が立たない。呼び出し側は update({}) を使うこと。
// - それ以外は、前回照会から ROLE_REFRESH_INTERVAL_MS 経過したときだけ照会する。
//   毎リクエスト user/account の2クエリを払う従来実装は全ページ・全APIの恒常的な遅延源だった。
//   一方で照会を完全にやめると、DB 側での role 変更・剥奪が最長30日（セッション寿命）反映されない。
//   時間ベースの再照会で「通常は DB フリー、権限変更の反映遅延は最大15分」に落とし込む。
export const ROLE_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

interface JwtParams {
  token: Record<string, unknown> & { sub?: string };
  user?: unknown;
  trigger?: "signIn" | "signUp" | "update";
}

export async function refreshJwtToken({ token, user, trigger }: JwtParams) {
  if (!token.sub) return token;

  const isStale =
    typeof token.refreshedAt !== "number" ||
    Date.now() - token.refreshedAt > ROLE_REFRESH_INTERVAL_MS;

  if (!user && trigger !== "update" && !isStale) return token;

  const existingUser = await getUserById(token.sub);
  if (!existingUser) return token;

  const existingAccount = await getAccountByUserId(existingUser.id);

  token.isOAuth = !!existingAccount;
  token.name = existingUser.name;
  token.email = existingUser.email;
  token.role = existingUser.role;
  token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;
  token.refreshedAt = Date.now();

  return token;
}
