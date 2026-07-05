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
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

declare global {
  interface CloudflareEnv {
    IMAGES_BUCKET: AbsEmsR2Bucket;
  }
}

export {};
