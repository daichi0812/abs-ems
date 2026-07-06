/* Cloudflare Workers のカスタムエントリ。
 *
 * OpenNext(@opennextjs/cloudflare) が生成する worker は fetch ハンドラしか持たないため、
 * Cron Trigger（返却リマインダー）用の scheduled ハンドラをここで足す。
 * 生成 worker の fetch はそのまま再利用する（wrangler.jsonc の main をこのファイルに向ける）。
 *
 * .open-next/worker.js はビルド時（opennextjs-cloudflare build）に生成されるので、
 * 型チェック時点では存在しないことがある。生成物の有無で挙動が変わらないよう
 * @ts-ignore で握る（@ts-expect-error は生成物が残っていると「未使用」で失敗する）。
 *
 * 注意: このファイルは tsconfig.json の exclude に入れてある。@ts-ignore はエラーを
 * 握るだけで module 解決自体は行われるため、.open-next が残っていると 6MB 超の
 * バンドル済み handler.mjs まで型検査対象に入り、tsc / next build がスタック
 * オーバーフローで落ちる。このファイル自体は wrangler(esbuild) がデプロイ時に
 * 別途コンパイルする。
 */
// @ts-ignore .open-next/worker.js はビルド時に生成される
import worker from './.open-next/worker.js';

type ExecutionCtx = { waitUntil(p: Promise<unknown>): void };

export default {
  ...worker,
  async scheduled(_event: { cron: string }, env: CloudflareEnv, ctx: ExecutionCtx) {
    const base = env.AUTH_URL ?? 'https://abs-ems.forgeonics.com';
    const req = new Request(`${base}/api/cron/return-reminders`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ''}` },
    });
    // 生成 worker の fetch に内部リクエストを渡し、Next.js ランタイム内でルートを実行する
    // （Prisma / EMAIL バインディング / lib をそのまま再利用できる）。
    ctx.waitUntil(worker.fetch(req, env, ctx));
  },
};
