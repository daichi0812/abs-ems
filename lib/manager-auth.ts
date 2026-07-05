/**
 * 管理系API（機材・タグの変更）への簡易アクセス制御で使うヘッダー。
 *
 * NEXT_PUBLIC_MANAGER_KEY はクライアントバンドルに露出するため、これは厳密な
 * 認証ではなく、role=ADMIN 運用が整うまでの後方互換フォールバックとして扱う。
 * サーバー側の検証は lib/api-auth.ts の hasManagerAccess を参照。
 */
export const MANAGER_KEY_HEADER = "x-manager-key";

/**
 * 管理系API を叩くクライアントが付与するヘッダーを返す。
 * キーが未設定なら空オブジェクト（role=ADMIN のユーザーはキー不要）。
 */
export const managerAuthHeaders = (): Record<string, string> => {
  const key = process.env.NEXT_PUBLIC_MANAGER_KEY;
  return key ? { [MANAGER_KEY_HEADER]: key } : {};
};
