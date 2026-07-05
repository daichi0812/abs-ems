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
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
