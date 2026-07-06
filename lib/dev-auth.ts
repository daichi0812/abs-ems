/**
 * 開発者判定。フィードバック閲覧など「開発者専用」機能のゲートに使う。
 *
 * 部長ら運用者の role=ADMIN（管理画面ゲート）とは別系統:
 * ADMIN は機材・カテゴリの運用者、DEVELOPER_EMAILS はシステム開発者。
 * 環境変数 DEVELOPER_EMAILS にカンマ区切りでメールアドレスを列挙する
 * （ローカルは .env、本番は wrangler.jsonc の vars）。未設定なら誰も通らない。
 */
export const isDeveloperEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const allow = (process.env.DEVELOPER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
};
