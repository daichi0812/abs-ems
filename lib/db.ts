import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Cloudflare Workers ではリクエストをまたいだ DB 接続の再利用が禁止されているため、
// 従来のグローバル singleton（globalThis.prisma）は使えない。
// 「リクエストごとに」クライアントを生成し、React の cache() で同一リクエスト内だけ
// memoize する（OpenNext の DB howto 準拠）。Neon ドライバアダプタ経由で接続する。
export const getDb = cache((): PrismaClient => {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
});

// 後方互換レイヤ:
// 既存コードは `import { db } from "@/lib/db"` で `db.user.findMany()` のように使う。
// それらを一括改修せずに済むよう、プロパティアクセスのたびに getDb()（リクエスト内 memoize 済み）
// へ委譲する Proxy を `db` として公開する。モジュールロード時には接続を張らないため、
// Workers の per-request 制約を満たしつつ呼び出し側は無改修で動く。
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
