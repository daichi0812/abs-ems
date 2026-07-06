// OpenNext の getCloudflareContext().env（型は global な CloudflareEnv）へ、
// 本アプリ固有の R2 バインディングを型追加する。
//
// なぜ wrangler types のフル生成物（worker-configuration.d.ts）を使わないか:
//   フル生成物は Workers ランタイムのグローバル型一式を注入し、DOM の
//   Response.json() を Promise<unknown> に上書きしてしまう。すると
//   `fetch(...).then(res => res.json())` に依存するクライアント側フックが
//   軒並み「'x' is of type 'unknown'」で next build に失敗する。
//   本アプリが実際に使うのは IMAGES_BUCKET.put だけなので、Workers グローバルを
//   持ち込まず、最小の構造的型だけをここで定義する。
//   （バインディングを増やしたらここへ追記する。cf-typegen の出力は tsconfig で
//    exclude 済みなので生成しても型検査には影響しない。）

interface AbsEmsR2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | Blob | string | null,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
}

// Email Sending バインディング（wrangler.jsonc の send_email）。
// 本アプリが使う send() の最小型のみ（フル型は worker-configuration.d.ts を使わない方針のため）。
interface AbsEmsSendEmail {
  send(message: {
    to: string | string[];
    from: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }): Promise<{ messageId?: string }>;
}

declare global {
  interface CloudflareEnv {
    IMAGES_BUCKET: AbsEmsR2Bucket;
    EMAIL: AbsEmsSendEmail;
    // worker.ts の scheduled ハンドラが内部 cron エンドポイントを叩くときに使う。
    // AUTH_URL は wrangler.jsonc の vars、CRON_SECRET は wrangler secret で投入。
    AUTH_URL?: string;
    CRON_SECRET?: string;
  }
}

export {};
