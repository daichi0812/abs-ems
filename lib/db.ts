import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Cloudflare Workers ではリクエストをまたいだ DB 接続の再利用が禁止されている
// （"Cannot perform I/O on behalf of a different request"）ため、従来のグローバル
// singleton（globalThis.prisma）は使えない。
//
// 旧実装は React の cache() で「リクエスト内 memoize」を狙っていたが、cache() は
// RSC のレンダリング中しか効かず、API ルートハンドラでは毎アクセスが素通しになる。
// その結果、DB 文を1つ実行するたびに新しい PrismaClient + Neon 接続（TLS +
// WebSocket + 認証のハンドシェイク）が張られ、実測で1文あたり 250〜500ms の
// オーバーヘッドが乗っていた（例: 予約 POST は認証2クエリ＋トランザクションで
// 直列3接続）。
//
// 現実装は OpenNext の per-request コンテキストに乗る:
// 本番 Worker はリクエストごとに AsyncLocalStorage へ新しい store（{env, ctx, cf}）を
// 積み、globalThis[Symbol.for("__cloudflare-context__")] の getter がそれを返す
// （.open-next/cloudflare/init.js。RSC・ルートハンドラ・waitUntil 内すべてで有効）。
// この store オブジェクトを WeakMap のキーにすると「1リクエスト=1クライアント」に
// 正確に集約でき、リクエスト終了後は store ごと GC される。
//
// ※ @opennextjs/cloudflare の getCloudflareContext() と同じ入口だが、db.ts は
//   middleware（edge ビルド）にもバンドルされるため、パッケージを import せず
//   シンボルを直接読む（シンボル名は OpenNext が worker テンプレートと同期を保証）。
const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

function getRequestStore(): object | undefined {
  const store = (globalThis as Record<symbol, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL];
  return typeof store === "object" && store !== null ? store : undefined;
}

const perRequestClients = new WeakMap<object, PrismaClient>();

// Node 環境（next dev / vitest / next build）用のプロセスワイド singleton。
// Workers の per-request 制約は workerd 上だけの話なので、Node では共有してよい。
let nodeSingleton: PrismaClient | undefined;

function createClient(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function isCloudflareWorkers(): boolean {
  // workerd は navigator.userAgent を "Cloudflare-Workers" に固定している
  return (
    (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ===
    "Cloudflare-Workers"
  );
}

export function getDb(): PrismaClient {
  // 本番 (Workers): リクエストごとの ALS store をキーに1接続へ集約する
  const store = getRequestStore();
  if (store) {
    let client = perRequestClients.get(store);
    if (!client) {
      client = createClient();
      perRequestClients.set(store, client);
    }
    return client;
  }
  if (isCloudflareWorkers()) {
    // Workers 上で ALS の外に出た想定外のケース。リクエスト跨ぎの共有は禁止されて
    // いるため、遅くても安全な「都度生成」に倒す（旧実装と同じ挙動）。
    return createClient();
  }
  // ALS の外 = Node 環境（next dev / vitest / build）
  nodeSingleton ??= createClient();
  return nodeSingleton;
}

// 後方互換レイヤ:
// 既存コードは `import { db } from "@/lib/db"` で `db.user.findMany()` のように使う。
// それらを一括改修せずに済むよう、プロパティアクセスのたびに getDb()（リクエスト内
// 共有済み）へ委譲する Proxy を `db` として公開する。モジュールロード時には接続を
// 張らないため、Workers の per-request 制約を満たしつつ呼び出し側は無改修で動く。
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    // receiver は敢えて渡さない: Prisma のモデルアクセサ（db.user 等）が this 経由の
    // getter だと receiver=Proxy で get トラップに再入し、再帰や別インスタンス化を招くため。
    // client を直接参照し、メソッドは client に bind して返す。
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
  // PrismaAdapter 等が `prop in db` を使うケースに備えて has も委譲する。
  has(_target, prop) {
    return prop in getDb();
  },
});
