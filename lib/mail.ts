import { getCloudflareContext } from "@opennextjs/cloudflare";

/* トランザクションメール送信（2FA コード・パスワードリセット・確認メール）。
 *
 * Resend SDK → Cloudflare Email Sending（Workers バインディング）へ移行（2026-07-06）。
 * - 送信元は noreply@abs-ems.forgeonics.com に統一（wrangler.jsonc の
 *   allowed_sender_addresses で束縛。ドメインはオンボード済み＝SPF/DKIM/DMARC 設定済み）。
 * - API キー不要（binding 経由）。RESEND_API_KEY への依存は撤去。
 * - getCloudflareContext() は「関数内で」呼ぶ: Workers ランタイム
 *   （本番／wrangler dev／npm run preview）でのみ利用可能なため、モジュール
 *   トップで呼ぶと next dev(Node) で import しただけで落ちる。
 * - html と text を必ず併記する（テキスト専用クライアント対応＋スパム判定の改善）。
 */

const FROM = { email: "noreply@abs-ems.forgeonics.com", name: "ABS EMS" };

const domain = process.env.NEXT_PUBLIC_APP_URL;

export const sendTwoFactorTokenEmail = async (
    email: string,
    token: string
) => {
    const { env } = getCloudflareContext();
    await env.EMAIL.send({
        from: FROM,
        to: email,
        subject: "2FA Code",
        html: `<p>Your 2FA code: ${token}</p>`,
        text: `Your 2FA code: ${token}`,
    });
};

export const sendPasswordResetEmail = async (
    email: string,
    token: string,
) => {
    const resetLink = `${domain}/auth/new-password?token=${token}`

    const { env } = getCloudflareContext();
    await env.EMAIL.send({
        from: FROM,
        to: email,
        subject: "Reset your password",
        html: `<p>Click <a href="${resetLink}">here</a> to reset password.</p>`,
        text: `Reset your password: ${resetLink}`,
    });
};

export const sendVerificationEmail = async (
    email: string,
    token: string,
) => {
    const confirmLink = `${domain}/auth/new-verification?token=${token}`;

    const { env } = getCloudflareContext();
    await env.EMAIL.send({
        from: FROM,
        to: email,
        subject: "Confirm your email",
        html: `<p>Click <a href="${confirmLink}">here</a> to confirm email.</p>`,
        text: `Confirm your email: ${confirmLink}`,
    });
}
