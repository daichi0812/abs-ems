# Runbook: Vercel → Cloudflare(OpenNext) ＋ R2 移行手順

このドキュメントは [`decisions/ADR-001_migrate-to-cloudflare-opennext-r2.md`](decisions/ADR-001_migrate-to-cloudflare-opennext-r2.md) で決定した移行の**実作業手順**をまとめた運用文書。判断の背景・却下案（FastAPI 分割）は ADR を参照。

- **前提**: Next.js モノリスを維持。DB は Neon 据え置き。画像は Vercel Blob → R2。FastAPI・Cloudflare Containers は使わない。
- **各手順のコマンド/設定値は 2026-07 時点の一次ソースで検証済み。** OpenNext / Prisma は更新が速いので、着手時に各ページの最新を再確認すること。

---

## 全体方針と順序

「小さく可逆に」を意図しても、**R2 バケットバインディング（`env.BUCKET.put`）は Workers ランタイム専用**で Vercel 上の Next からは使えない。したがって「画像の R2 化コード」だけを先行導入することはできず、OpenNext への移行とセットになる。可逆に先行できるのは **バケット準備・既存画像のデータ移行だけ**。この現実を踏まえ、順序は以下とする。

```
Phase 0  準備・実測・棚卸し            … 破壊的変更なし
Phase 1  OpenNext で Workers 上で動かす  … プレビュー環境で。本番ドメインはまだ切替えない
Phase 2  画像を R2 へ（コード＋データ移行）… プレビュー環境で検証
Phase 3  Vercel 依存の切り離し
Phase 4  カットオーバー＆検証＆ロールバック … 可逆点は DNS/ドメイン切替
```

Vercel の本番は Phase 4 で切替が確定するまで**残しておく**（ロールバック先）。

> ブランチ運用: リポジトリ規約（[`../agents/workflow.md`](../agents/workflow.md)）に従い、`develop` から `feat/cloudflare-migration` 等を切って作業し、`merge --no-ff` で戻す。本 runbook 自体の追加も同様。

---

## Phase 0 — 準備・実測・棚卸し

1. **Cloudflare 準備**: `wrangler` 4.107 は導入済み・`daichi8120@gmail.com`（Account ID `7bf10493dc9115e2aec069dfcdd43f22`）で認証済み。ただし**現在の OAuth トークンのスコープは account/user(read) と workers/workers_kv(write) のみで、R2 権限が含まれない**。R2 バケット作成・書き込みには **`wrangler login`（R2 スコープ付き）で再認証するか、ダッシュボードで操作**する必要がある。対象ゾーン（独自ドメイン）も確認。
2. **環境変数の棚卸し（重要）**: ローカル `.env` だけでなく **Vercel の全環境変数**をエクスポートして突き合わせる。
   - コードが参照する `NEXT_PUBLIC_MANAGER_KEY` は**ローカル `.env` に無く、Vercel 側にしか存在しない可能性が高い**。ここで拾い漏らすと管理者ゲート（`lib/api-auth.ts` の `hasManagerAccess`）が本番で壊れる。
   - 分類は [付録B](#付録b-環境変数マップ) の通り（ビルド時インライン / 実行時 secret）。
3. **Worker サイズの実測（Free/Paid の分岐点）**: Phase 1 の設定を入れたら `opennextjs-cloudflare build` を回し、生成 Worker の**圧縮後サイズ**を 3 MiB（Free 上限）と比較する。超えるなら Workers Paid（月 $5）が必要。低トラフィックゆえコストを分ける実質唯一の要因はこれ。
4. **R2 バケット作成**: `abs-ems-images` 等を作成し、**カスタムドメイン**（例 `img.example.com`）を接続。`r2.dev` はレート制限つき開発用途専用なので本番配信に使わない。

---

## Phase 1 — OpenNext で Cloudflare Workers 上で動かす

### 1-1. 依存とスクリプト

```bash
npm i @opennextjs/cloudflare
npm i -D wrangler
npm i @prisma/adapter-neon
# Prisma を 6.19.x へ（7.0.0 は Workers で未解決の WASM 不具合 #28657 のため避ける）
npm i prisma@^6.19 @prisma/client@^6.19
```

`package.json` scripts に追加:

```jsonc
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

### 1-2. `wrangler.jsonc`（新規）

```jsonc
{
  "name": "abs-ems",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "r2_buckets": [
    { "binding": "IMAGES_BUCKET", "bucket_name": "abs-ems-images" }
  ]
  // 画像最適化を使うなら: "images": { "binding": "IMAGES" }
}
```

- `nodejs_compat` は必須（`node:crypto` が jose / bcryptjs から使えるようにする）。`compatibility_date` は 2024-09-23 が下限だが、`process.env` の実行時反映や `FinalizationRegistry`（ISR 由来）対策のため **2025-04-01 以降**を推奨。
- 型生成: `npx wrangler types`。

### 1-3. `open-next.config.ts`（新規）

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

ISR を実際に使う場合のみ incremental cache（R2/KV）とタグキャッシュ（SQLite 方式の Durable Object。Free でも可）を設定。動的中心のこのアプリでは最小構成で開始し、必要時に追加。

### 1-4. Prisma を Workers 対応へ

`prisma/schema.prisma`:

> **✅ 実証済み（当初計画からの修正）**: 当初は新 `prisma-client` generator＋`runtime="cloudflare"`＋`output` で import 総差し替えを想定したが、**OpenNext の DB howto 方式で不要**と判明。`prisma/schema.prisma` の **generator は変更なし**（`provider = "prisma-client-js"` のまま。Prisma 6.19 で driverAdapters は GA＝preview フラグ不要）。datasource も当面 `url = env("DATABASE_URL")` のまま（`directUrl` は migrate を打つ時だけ追加。今回はスキーマ変更が無いので不要）。

`lib/db.ts` を **per-request 生成＋後方互換 Proxy** へ書き換え（Workers は接続の使い回しが禁止）。import パスは従来の `@prisma/client` のままで、呼び出し側（約30ファイル）は無改修:

```ts
import { cache } from "react";
import { PrismaClient } from "@prisma/client";        // import パスは従来どおり
import { PrismaNeon } from "@prisma/adapter-neon";

// リクエストごと生成、React cache() で同一リクエスト内 memoize
export const getDb = cache((): PrismaClient => {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
});

// 後方互換: 既存の `import { db }` / `db.xxx.method()` を無改修で動かす Proxy。
// プロパティアクセス毎に getDb()（memoize済み）へ委譲＝モジュールロード時に接続を張らない。
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = getDb();
    // receiver は渡さない: Prisma のモデルアクセサが this 経由 getter だと
    // receiver=Proxy で get トラップに再入し得るため、c を直接参照する。
    const v = Reflect.get(c, prop);
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
  // PrismaAdapter 等が `prop in db` を使うケースに備えて has も委譲。
  has(_t, prop) {
    return prop in getDb();
  },
});
```

> **Proxy の堅牢化（要点）**: `get` トラップで `Reflect.get` に **receiver を渡さない**こと。渡すと Prisma のモデルアクセサ（`db.user` 等）が this 経由 getter の場合に receiver=Proxy でトラップへ再入し、再帰や別インスタンス生成を招く。`has` も委譲して `prop in db` に備える。この Proxy は**モックされないコード経路（`PrismaAdapter(db)` の実 create/update、per-request の接続数）を含め、workerd 実行時に必ず動作確認する**（下記「1-6 実行時検証」）。ビルド通過とモックテスト全通過は**必要条件であって十分条件ではない**。

> **churn は最小（実証済み）**: 上記 Proxy により `import { db }` 系（`auth.ts` の `PrismaAdapter(db)` 含む約30ファイル）は無改修。import パスも `@prisma/client` のままなので型 import の差し替えも不要。**vitest 335 テストも無改修で全通過**。
>
> **DB スキーマ変更なし**: モデル定義は不変＝`prisma migrate` は走らない（Neon 本番への破壊的変更なし）。`prisma generate`（`postinstall`）はそのまま維持。
>
> **依存の固定**: `prisma`/`@prisma/client`/`@prisma/adapter-neon` を **6.19.x に固定**（既定だと adapter-neon が Prisma 7 系を引く。7.0 は Workers の WASM 不具合 #28657 で不可）。`bcryptjs`→3.x、重複する `@types/bcryptjs` は除去。

`next.config.mjs` に外部化を追加:

```js
// nextConfig に:
serverExternalPackages: ["@prisma/client", ".prisma/client"],
```

`prisma generate` はビルドに残す（純コード生成で DB 接続不要。`postinstall` の既存設定を維持しつつ、`next build` 前に生成物が存在すること）。

### 1-5. 認証まわり（コード変更は最小、大半は設定）

- **bcryptjs を 3.x へ**: `npm i bcryptjs@^3`。2.4.3 は workerd 上で salt/hash 生成の乱数源が不安定で、**登録・パスワードリセット・2FA 登録が壊れうる**（`bcrypt.compare` のログイン照合だけなら 2.4.3 でも動くが、生成系のために 3.x は必須扱い）。**ハッシュ形式（`$2a$`/`$2b$`）は不変**なので既存パスワードはそのまま検証でき、リセット不要。
- **`export const runtime = "edge"` を新設しない**（現状のリポジトリには無い＝良好）。`app/api/auth/[...nextauth]/route.ts` は標準の `export const { GET, POST } = handlers` のままで可。
- **secret / vars**（Phase 3・付録B で詳述）: `AUTH_SECRET` は**現行本番と同一値**、`AUTH_TRUST_HOST=true`、`GOOGLE_*`・`GITHUB_*`。
- 任意（bundle 衛生）: middleware が共有する `auth.config` から bcrypt/Prisma を切り離すと edge 共有バンドルが軽くなる。まず動かしてサイズを見てから判断。

### 1-6. 実行時検証（workerd 実行 — Phase 1 完了の必須ゲート）

> **⚠️ ここが Phase 1 完了の判定条件**。`cf:build` 通過＋モックテスト全通過は**コンパイルと Node モック挙動しか保証しない**。DB クエリ 1 本・認証フロー 1 本すら **workerd 上で実行されていない**。以下の実行時スモークを通して初めて Phase 1 を「検証済み」と呼べる。特に `lib/db.ts` の Proxy と `PrismaNeon`（WebSocket）の workerd 接続は、モックされないため未検証。

手順:

- `.dev.vars` に実行時 secret（`AUTH_SECRET` / `DATABASE_URL` / OAuth secret / `RESEND_API_KEY`）と `NEXTJS_ENV=development` を置く（値は `.env.vercel-export` から。`.dev.vars` は gitignore 済み）。
- `npm run preview`（= `opennextjs-cloudflare build && ... preview`）で Workers ランタイム(workerd)上でローカル起動。
- 起動した Worker に対し**最低 2 系統**を実際に叩く:
  1. **read パス**（例: 機材一覧ページ）— Proxy → `getDb()` → `PrismaNeon` の workerd 接続と DB 読取を通す。
  2. **credentials サインイン** — `bcrypt.compare` ＋ JWE セッション発行 ＋ `PrismaAdapter(db)` の実書き込み系を通す。
- あわせて **per-request の Neon 接続数**を確認（Proxy 経由で `db.x` アクセス毎に新クライアントが生成されていないか。cache() スコープが効いていれば 1 リクエスト 1 クライアント）。

> **🛑 本番 DB 汚染ハザード**: `DATABASE_URL` は**本番 Neon 直結**（メモリ/ADR 参照）。認証フロー（登録・`linkAccount` の `emailVerified` 更新・2FA 確認削除・adapter のユーザー/セッション作成）は**書き込みを伴う**ため、サインインのスモークを本番 DB で流すと**本番データを変更する**。→ **Neon のブランチ機能**で本番のisolatedコピーを作り、`.dev.vars` の `DATABASE_URL` をそのブランチに向けてテストする。read パスだけなら本番でも可だが、書き込み系は必ずブランチで。
>
> **Proxy が実行時に失敗した場合のフォールバック**: 30ファイル無改修を狙った Proxy はあくまで「賭け」。もし delegate 再入・adapter の enumerate・接続過多が出たら、各呼び出し側を明示的な `getDb()` に置き換える（退屈だが安全）方式に切り替える。

> **✅ Phase 1 scaffold 実測結果（2026-07-05・ビルド/テスト段階）**: `npm run cf:build` 成功（`next build` 型検査通過＋OpenNext 変換完了、Prisma も workerd 向けに正常バンドル）。**vitest 335 テスト全通過**、`tsc --noEmit` は `lib/db.ts` エラー無し（残る 1 件は既存のテストファイルの `RefObject` キャストで `next build` 対象外）。`wrangler deploy --dry-run` の圧縮アップロードサイズ = **gzip 4.37 MiB**（生 ~18 MiB）。→ **Free の 3 MiB 上限は超過、Paid の 10 MiB には余裕で収まる**。コストは既に「Vercel Pro $20 vs CF $5」で決着済みなので、Paid $5 で確定。

> **✅ read パス 実行時検証 完了（2026-07-05・workerd 実行）**: `npm run preview` で workerd をローカル起動し、認証なしの一時プローブ（`db.list/tag/user.count()` のみ・レコード非返却・検証後に削除、`routes.ts` publicRoutes へ一時追加も revert 済み）で本番 Neon への読取を実行。結果 **HTTP 200 `{listCount:43, tagCount:6, userCount:97}`**。これで以下が **workerd 実行時に**確認できた:
> - workerd が OpenNext Worker を起動しリクエストを処理する
> - `lib/db.ts` の **Proxy が複数モデル（list/tag/user）を再帰なく解決**（堅牢化が有効）
> - **`PrismaNeon`(WebSocket) が workerd から本番 Neon へ実接続**して読取（最大の未知が解消）
> - `cache()` ＋ `Promise.all` の3クエリが1クライアントで動作。**コールド 2.04s → ウォーム 0.37s** で接続再利用も確認
> - **middleware の認証ゲートが workerd 上で機能**（公開外ルートは 302 で `/auth/login` へ。プローブ追加前は 302、追加後 200 で挙動一致）
>
> **⏳ 未検証（残ゲート）**: **credentials サインインの書き込み系**（`bcrypt.compare` ＋ JWE 発行 ＋ `PrismaAdapter(db)` の実 create/update）は本番 DB を汚すため未実施。**Neon ブランチ**を用意してから流す。ここまでで Phase 1 は「**read パス実行時検証済み・書き込みauth系は Neon ブランチ待ち**」の段階。

---

## Phase 2 — 画像を R2 へ（コード＋データ移行）

### 2-1. アップロードコード（`app/api/upload/route.ts`）— ✅ 実装確定・workerd 検証済み

`@vercel/blob` の `put()` を R2 バインディングへ置換。`hasManagerAccess` ゲートは維持。**実際にコミットした形**:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
// hasManagerAccess / filename チェックの後:
const baseUrl = process.env.R2_PUBLIC_BASE_URL;
if (!baseUrl) return NextResponse.json({ error: "Image storage is not configured" }, { status: 500 });

// R2 の put() は同一キーをエラー無しで上書きするため UUID で一意化（旧 addRandomSuffix 相当）
const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
const key = `${crypto.randomUUID()}-${safeName}`;

const { env } = getCloudflareContext();
const body = await req.arrayBuffer();
await env.IMAGES_BUCKET.put(key, body, {
  httpMetadata: { contentType: req.headers.get("content-type") ?? undefined },
});

const url = `${baseUrl.replace(/\/$/, "")}/${key}`;
return NextResponse.json({ url }); // 呼び出し側フックは .url しか使わない＝後方互換
```

- **`R2_PUBLIC_BASE_URL`**: 配信カスタムドメインのベース URL（例 `https://img.abs-ems.example`）。実行時 var（secret でも `NEXT_PUBLIC` でもない。組み立てた絶対 URL を `List.image` に保存し、クライアントは DB 由来の URL を読むだけで env は参照しない）。preview では `.dev.vars` に置く。本番は wrangler の var/secret としてカットオーバー時に設定。
- **応答は `{ url }` に固定**。フック（`use-equipment-registration.ts` / `use-equipment-update.ts`）は `blob.url` のみ参照済みなので無改修。

> **型の判断（重要・ハマりどころ）**: `getCloudflareContext().env.IMAGES_BUCKET` を型付けするのに **`wrangler types` のフル生成物（`worker-configuration.d.ts`）は使わない**。あれは Workers ランタイムのグローバル型一式を注入し、**DOM の `Response.json()` を `Promise<unknown>` に上書き**する。すると `fetch(...).then(res => res.json())` に依存するクライアント側フック（`use-equipment-page-data.ts` 等）が軒並み `'x' is of type 'unknown'` で **`next build` に失敗**する（Phase 1 で cf:build が通ったのはこの d.ts が無かったから）。
> → 代わりに **`cloudflare-env.d.ts`（手書き）** で global `CloudflareEnv` に `IMAGES_BUCKET` の最小構造型だけを足す。OpenNext 自身が `declare global { interface CloudflareEnv }` を持つので追記でよく、`skipLibCheck` により未解決の Workers 型は無害。`worker-configuration.d.ts` は **gitignore＋tsconfig exclude** 済みで、`cf-typegen` を実行して生成されても型検査に影響しない（＝`cf-typegen` の出力は事実上未使用のディスカバリ用）。

`next.config.mjs` の画像設定 — **`unoptimized: true`**（`domains` は撤去）:

```js
images: {
  // 移行期は旧 Vercel Blob ホストと新 R2 ホストが混在するため allowlist を張らずに済む
  // unoptimized で開始。機材画像の利用は next/image 2箇所のみ（reserve / store）。
  unoptimized: true,
}
```

> **next/image の最適化**: Workers 上では自動で効かない。効かせるには `IMAGES` バインディング（Cloudflare Images／課金）か独自ローダー（`/cdn-cgi/image`、ゾーンで Image Transformations 有効化）が要る。利用2箇所なのでまず `unoptimized: true` で R2 から素配信し、必要なら後で `remotePatterns`＋最適化を足す。

> **✅ upload 実行時検証 完了（2026-07-05・workerd 実行）**: `npm run preview` で workerd 起動、`/api/upload` を一時的に publicRoutes 追加（middleware はセッションで判定し `x-manager-key` を見ないため。検証後 revert 済み）して POST。**ヘッダ無し→403、`x-manager-key`（=`NEXT_PUBLIC_MANAGER_KEY`）付き→200 `{"url":".../<uuid>-smoke_test_.png"}`**（`smoke test!.png` がサニタイズされキー一意化も確認）。さらに `.wrangler/state/v3/r2/abs-ems-images/blobs/` に **27B の blob** が生成され、R2 メタ SQLite に当該キーが記録＝**miniflare ローカル R2 へ実体が永続化**されたことまで確認（本番 R2 は不使用・DB 非接触＝安全）。これで `env.IMAGES_BUCKET` バインディング配線・`put()`・一意キー・`hasManagerAccess` が **workerd 実行時に**動くことが取れた。**vitest 336 テスト全通過**（upload テストは R2 バインディングのモックへ更新済み）。

### 2-2. データ移行（既存画像の移送 ＋ URL 書き換え）

Vercel Blob は **S3 互換エンドポイントを持たない**ため rclone/aws-cli で直接 pull できない。二段構えで行う。

1. **列挙＆ダウンロード（一度きりの Node スクリプト）**: `BLOB_READ_WRITE_TOKEN` で `@vercel/blob` の `list({ cursor, limit: 1000 })` を `hasMore` が尽きるまでページング。各 `blob.url`（公開）を fetch し、`pathname` を保ったまま `./export/<pathname>` に保存。
   - **事前確認**: `addRandomSuffix` の既定は false。**既存 pathname にランダムサフィックスが実在するか**を実データ（`list()` 結果）で確認する。無い場合、後段のホスト差し替え SQL が 1:1 で当たるかを検証してから進める。
   - 日本語・特殊文字を含む pathname は URL エンコードと R2 キー／SQL の `LIKE` 整合をサンプルで検証。
2. **R2 へ投入**: rclone を S3 互換で設定（`type=s3, provider=Cloudflare, endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`、R2 API トークンで Access Key 発行）し、`rclone copy ./export/ r2:abs-ems-images/`。**キー = 元 pathname** のまま入れる。
3. **Neon の URL 書き換え**（検証後に実行）:

```sql
UPDATE "List"
SET image = REPLACE(image,
  'https://a9imy1jqjrudia3w.public.blob.vercel-storage.com/',
  'https://img.example.com/')
WHERE image LIKE 'https://a9imy1jqjrudia3w.public.blob.vercel-storage.com/%';
```

   キー=pathname を保ったのでホスト差し替えだけで一致する。**この `UPDATE` は本番 Neon への不可逆な直接変更**（プロジェクト前提: ローカルの `DATABASE_URL` は本番 Neon を直に指す）。実行前に必ず、(a) `SELECT id, image FROM "List"` で**現在の `List.image` 値をスナップショット保存**、(b) `SELECT` で対象件数を確認、してから `UPDATE`。切り戻しはこのスナップショットからの復元で行う。

> **キー方式の整合（重要）**: 上の SQL がホスト差し替えだけで済むのは、**移行する既存オブジェクトを「元の Vercel Blob pathname をそのまま R2 キー」にして投入する**からである（`rclone copy` でキー＝pathname を維持）。一方 **2-1 の新規アップロードは `${uuid}-${filename}` キー**を使う。両者は方式が違うが、`List.image` には常に**絶対 URL 全体**が入るので混在して問題ない（移行済み行＝旧 pathname 由来 URL、新規行＝uuid 由来 URL、いずれも同じ R2 カスタムドメイン配下）。SQL の置換先ホスト（`https://img.example.com/`）は **2-1 の `R2_PUBLIC_BASE_URL` と同一値**にすること。

---

## Phase 3 — Vercel 依存の切り離し

- **Speed Insights 削除**: `app/layout.tsx` の `<SpeedInsights />` と import を削除、`@vercel/speed-insights` を uninstall。代替が要れば Cloudflare Web Analytics（ただし**ルート別 Core Web Vitals は取れない**、サイト全体の指標のみ）。
- **Vercel Blob 依存削除**: `@vercel/blob` を uninstall。機材フックの `import type { PutBlobResult } from "@vercel/blob"`（`use-equipment-registration.ts` / `use-equipment-update.ts`）も削除し、返り値型を新しいアップロード応答（`{ url: string }`）に合わせる。
- **Resend**: SDK はそのまま Workers で動く。ただし `lib/mail.ts` は `const resend = new Resend(process.env.RESEND_API_KEY)` を**モジュール先頭で読む**。`RESEND_API_KEY` を**実行時 secret** として供給する（ビルド時 `NEXT_PUBLIC` にしない）。モジュール初期化時に凍結される懸念があれば、`resend` 生成を各関数内へ移す。
- **環境変数の移管**: [付録B](#付録b-環境変数マップ) の通り、実行時 secret を `wrangler secret put` / ダッシュボードへ。デプロイは `--keep-vars` でダッシュボード設定を消さない。

---

## Phase 4 — カットオーバー＆検証＆ロールバック

0. **🔴 認証2点セットの確認（両方必須・片方だけだと壊れる）**: **`AUTH_URL=https://www.abs-ems.logicode.tech`（真因A対策）** ＊かつ＊ **`middleware.ts` の `/api/auth` matcher 除外（真因B対策・付録A/D）** が両方入っていること。`AUTH_URL` だけ→ログアウト不能が再発（真因B）、matcher だけ→session=null（真因A）。付録D 参照。
1. **本番 secret 投入**: `AUTH_SECRET` は**現行本番と同一値**（変えると既存の暗号化 JWE セッションが全て失効し全ユーザー強制ログアウト）。`AUTH_TRUST_HOST=true`。`AUTH_URL`（上記）。DB は プール URL（`DATABASE_URL`）＋直結（`DIRECT_URL`）。
2. **OAuth コールバック URL 追加**: Google Cloud / GitHub の OAuth 設定に `https://<新ドメイン>/api/auth/callback/google` と `.../github` を追加。
3. **デプロイ**: `npm run deploy`（`--keep-vars`）。まず Workers の `*.workers.dev` かプレビュードメインで [付録C](#付録c-検証チェックリスト) を通す。
4. **ドメイン切替（可逆点）**: 独自ドメインの向き先を Cloudflare Workers へ。問題があれば **Vercel に戻すのがロールバック**（Vercel 側は残してある）。`AUTH_SECRET` 同値なのでセッションは往復しても維持される。
5. **後片付け**: 全件表示・全機能 OK 後、Vercel Blob ストア/トークンを廃止、`r2.dev` 公開を無効化しカスタムドメイン運用に。

---

## 付録A: 変更ファイル一覧

| 対象 | 変更内容 |
|---|---|
| `package.json` | +`@opennextjs/cloudflare` +`wrangler`(dev) +`@prisma/adapter-neon`、`prisma`/`@prisma/client`/`@prisma/adapter-neon`→`6.19`、`bcryptjs`→`3`、−`@types/bcryptjs`、（Phase 2/3 で −`@vercel/blob` −`@vercel/speed-insights`）、scripts に `cf:build`/`preview`/`deploy`/`cf-typegen` |
| `wrangler.jsonc`（新規） | name=abs-ems / main=.open-next/worker.js / compatibility_date=2025-05-05 / flags[nodejs_compat, global_fetch_strictly_public] / assets(ASSETS) / r2_buckets(IMAGES_BUCKET→abs-ems-images) / observability |
| `open-next.config.ts`（新規） | `defineCloudflareConfig({})`（ISR 使用時のみ cache 設定追加） |
| `prisma/schema.prisma` | **変更なし**（generator は `prisma-client-js` のまま。6.19 で driverAdapters GA。`directUrl` は migrate 時のみ追加） |
| `lib/db.ts` | グローバル singleton 廃止 → `getDb()`（per-request・`cache()`）＋ `db` を Proxy で後方互換（**呼び出し側 約30ファイルは無改修**） |
| ~~`@prisma/client` import 差し替え~~ | **不要**（Proxy＋import パス据え置きで回避。当初計画からの修正） |
| `next.config.mjs` | `images.domains` 撤去 → `images.unoptimized:true`（移行期の旧/新ホスト混在を allowlist 不要に）、`serverExternalPackages` 追加、`withSerwist` は維持 |
| `cloudflare-env.d.ts`（新規） | global `CloudflareEnv` に `IMAGES_BUCKET` の最小型を追記。**`worker-configuration.d.ts` は使わない**（Workers グローバル型が DOM `Response.json()` を壊す）。`worker-configuration.d.ts` は `.gitignore`＋`tsconfig` exclude 済み |
| `app/api/upload/route.ts` | `@vercel/blob put` → `getCloudflareContext().env.IMAGES_BUCKET.put`（`${uuid}-${safeName}` 一意キー＋contentType）、URL は `R2_PUBLIC_BASE_URL/<key>`、応答は `{ url }`。base 未設定は 500 |
| `app/layout.tsx` | `<SpeedInsights/>` と import 削除 |
| `use-equipment-registration.ts` / `use-equipment-update.ts` | `PutBlobResult` 型 import 削除、応答型を `{ url }` に |
| `lib/mail.ts` | `RESEND_API_KEY` を実行時 secret として供給（必要なら関数内読みへ） |
| `middleware.ts` | **matcher から `/api/auth` を除外**（`'/((?!api/auth\|.+\\.[\\w]+$\|_next).*)'`＋`'/(api(?!/auth)\|trpc)(.*)'`）。middleware の `auth()` が `/api/auth/signout` で Auth.js を二重実行し signout の削除 cookie を打ち消す**ログアウト不能の真因B**の対策（付録D）。ページ/その他 API の保護は不変 |
| `auth.config.ts` | `trustHost: true` を静的に明示（ハンドラ用＋middleware 用の両 NextAuth インスタンスに効かせる。付録D） |
| `components/auth/logout-button.tsx` | Server Action `logout()` → **クライアント `signOut`（`next-auth/react`, `/api/auth/signout` へ POST）**。Server Action 版はページ経路 POST で真因B に潰されるため（付録D） |
| `actions/logout.ts` | **削除**（Server Action signout はページ経路に POST → middleware にマッチ → 削除 cookie が打ち消され使えない） |
| OAuth コンソール | Google / GitHub にコールバック URL 追加 |

---

## 付録B: 環境変数マップ

| 変数 | 区分 | 移行先 |
|---|---|---|
| `AUTH_SECRET` | 実行時 secret | wrangler secret（**現行本番と同一値**） |
| `AUTH_TRUST_HOST` | 実行時 var | `true`（新規。Workers は Auth.js 自動信頼対象外） |
| `AUTH_URL` | 実行時 var（**新規・重大**） | **本番 `https://www.abs-ems.logicode.tech`／workers.dev 検証 `https://abs-ems.<sub>.workers.dev`／ローカル preview `http://localhost:8787`**。未設定だと workerd の edge/node ランタイムでベース URL 推定が割れ、`useSecureCookies`＝cookie 名/JWE salt が middleware/route handler/ログインで食い違い **session=null 化**（付録D 真因A）。**必ず環境ごとに明示**。※ログアウト不能は別要因（middleware matcher・付録D 真因B）で、そちらは `middleware.ts` 側で対策済み。 |
| `DATABASE_URL` | 実行時 secret | wrangler secret（**プール URL**、`-pooler`） |
| `DIRECT_URL` | 実行時 secret | wrangler secret（**直結 URL**、migrate 用。新規） |
| `GOOGLE_CLIENT_ID` / `_SECRET` | 実行時 secret | wrangler secret |
| `GITHUB_CLIENT_ID` / `_SECRET` | 実行時 secret | wrangler secret |
| `RESEND_API_KEY` | 実行時 secret | wrangler secret（`lib/mail.ts` で使用） |
| `R2_PUBLIC_BASE_URL` | 実行時 var（新規） | R2 カスタムドメインのベース URL（例 `https://img.abs-ems.example`）。`app/api/upload/route.ts` が組み立てる公開 URL の前半。secret でも `NEXT_PUBLIC` でもない。preview は `.dev.vars`、本番は wrangler var。データ移行 SQL の置換先ホストと**同一値**にする |
| `SECRET_API_KEY` | — | **コード参照なし（2026-07 監査で確認）**。未使用なら移行不要。外部連携で使っていないか確認のうえ drop 検討 |
| `NEXT_PUBLIC_API_KEY` | ビルド時インライン | ビルド環境（`use-reservation-data.ts`） |
| `NEXT_PUBLIC_APP_URL` | ビルド時インライン | ビルド環境（**新ドメインに更新**） |
| `NEXT_PUBLIC_MANAGER_KEY` | ビルド時インライン | ビルド環境。**確定: ローカルに存在しない**（`.env` のみ・`.env.local` 無し）。**Vercel ダッシュボードから取得必須**。コード4箇所で使用（`Header.tsx` / `mypage/page.tsx` / `lib/api-auth.ts` / `lib/manager-auth.ts`） |
| `NODE_ENV` | フレームワーク自動 | 設定不要（Next/Workers が付与） |
| `BLOB_READ_WRITE_TOKEN` | 移行時のみ | データ移行スクリプトで使用後に廃止 |
| `AUTH_TRUST_HOST` | 実行時 var（新規） | `true`（Workers は Auth.js 自動信頼対象外） |
| `DIRECT_URL` | 実行時 secret（新規） | Neon 直結 URL（migrate/db pull 用） |

> `NEXT_PUBLIC_*` はクライアントバンドルにインラインされる（プラットフォーム非依存の既存挙動）。`NEXT_PUBLIC_MANAGER_KEY` / `NEXT_PUBLIC_API_KEY` がブラウザ露出する点は本移行では変わらない（元からの性質）。
>
> **棚卸し結果（2026-07-05）**: `npx vercel env pull` で全キーの存在を確認済み（上記＋Vercel 内部の `VERCEL_OIDC_TOKEN`。後者は移行不要）。ただし取得したのは **development 環境**。Cloudflare に投入するのは **production の値**であること。特に **`AUTH_SECRET` は本番値**でないと既存セッションが失効する。cutover 直前に `npx vercel env pull --environment=production .env.vercel-prod`（`.env*` で gitignore 済み）で本番値を取得して使う。

---

## 付録C: 検証チェックリスト（プレビュー→本番）

- [x] Credentials 新規登録＋ログイン — **Neon ブランチ＋workerd/preview で検証済み（2026-07-05）**。register（`bcrypt.hash`＋`db.user.create` の書込→ブランチDBに行を実確認）、login（`bcrypt.compare`＋JWE 発行→`/ems/mypage` へ遷移）成功。2FA 経路は未実施。**✅ session 一貫性は workers.dev https で再検証済み（2026-07-05）**: ログイン後 middleware（保護ルート遷移）・ページ描画・`/api/auth/session` の3者が一致（付録D 参照）。2FA/OAuth 経路は引き続き未検証。
- [ ] Google ログイン
- [x] **サインアウト＋セッション一貫性 — 解決済み ✅（workers.dev https で e2e 検証済み・2026-07-05。付録D 参照）** — 真因は2つ（A: `AUTH_URL` 未設定の cookie-secure 名割れ、B: middleware matcher が `/api/auth` を含む二重実行で signout の削除 cookie を打ち消す）。対策は **① `middleware.ts` の matcher から `/api/auth` 除外 ② `AUTH_URL` を環境ごとに設定 ③ クライアント `signOut`（`/api/auth/signout`）**。検証: ログアウト→`session=null`＋`/auth/login` 遷移、`GET /api/auth/csrf` の Set-Cookie が単一 `__Host-authjs.csrf-token`、未ログイン保護ルートは login へリダイレクト。**本番カットオーバー時に `AUTH_URL=https://www.abs-ems.logicode.tech` の投入を忘れないこと**（真因A が再発する）。
- [ ] GitHub ログイン（`@auth/prisma-adapter` の linkAccount 経路）
- [x] middleware で保護されたルートのリダイレクト挙動 — **検証済み**（未ログインで `/api/upload`・`/ems/*` が 302→`/auth/login`、ログイン後は保護ページ表示）
- [ ] 予約 CRUD（`lib/reservation-overlap.ts` の重複チェック含む）
- [ ] 機材／タグ CRUD（`hasManagerAccess` ゲート＝`NEXT_PUBLIC_MANAGER_KEY` 経路も）
- [x] 画像アップロード（新規、R2 に入る＋一意キー）— **workerd/preview で検証済み**（403→200、ローカル R2 に blob 永続化。2-1 参照）
- [ ] **既存 Vercel Blob 画像が表示できる（移行期の回帰確認）**: `unoptimized:true` は最適化と同時にホスト allowlist も外すので、`domains` 撤去後も旧 Vercel Blob URL の `<img>` は表示されるはず。`/ems/store`・`/ems/reserve/[id]` をブラウザで開き実際に描画されるか確認（curl では src 出力までしか見えない）
- [ ] **R2 配信での画像表示**（⏳ カスタムドメイン待ち）: `R2_PUBLIC_BASE_URL` を実カスタムドメインに向けて新規アップロード→当該 URL で表示されるか。**この表示パスはカスタムドメインが立つまで検証不能**（スモークは偽ホストのため保存までしか確認していない）
- [ ] PWA: `/sw.js` 登録、precache が 200、オフライン遷移、SW 更新サイクル
- [ ] メール送信（2FA / リセット / 確認）
- [ ] Worker 圧縮サイズが上限内（Free 3 MiB / Paid 10 MiB）

---

## 付録D: 既知の落とし穴（敵対的検証で確認済み）

- **`trustHost: true` をコードで明示する（重大・Phase 3 検証で判明）**。Auth.js v5 の `trustHost` 既定は `!!(AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? CF_PAGES ?? NODE_ENV!=='production')`。**Vercel はプラットフォームが `VERCEL` env を自動注入するため暗黙で true** になっていた（隠れた Vercel 依存）。Workers(OpenNext) では `VERCEL` 無し・`CF_PAGES` 無し（Pages 専用）・本番ビルドは `NODE_ENV=production`（OpenNext が define で焼き込む）で **trustHost が false に落ち、全 sign-in/callback/session が `UntrustedHost` で失敗＝本番認証が全断**。`AUTH_TRUST_HOST=true` の env だけに頼ると本番 env 投入を1つ落とすだけで全断するため、**`auth.config.ts` の設定に静的に `trustHost: true`** を置いた（`.env.vercel-export` にもこの env は無いので一括インポートでは補完されない）。**配置場所が重要**: このアプリは NextAuth を2つ生成する — `auth.ts`（ハンドラ用。`...authConfig` 展開）と `middleware.ts`（`NextAuth(authConfig)` を直接）。`auth.ts` 側にだけ置くと **middleware インスタンスは env 依存のまま**（env を落とすと middleware の認証判定が UntrustedHost 化しうる）。共有の `auth.config.ts` に置けば両インスタンスに効く。**✅ 検証済み（2026-07-05）**: `.dev.vars` から `AUTH_TRUST_HOST` を外し `trustHost:true`（コード）のみで再ビルドし、`/api/auth/session`→200・`/api/auth/csrf`→200 を確認（trustHost false なら `UntrustedHost` で失敗するはずのエンドポイントが正常応答）。
- **【重大・解決済み ✅（2026-07-05, workers.dev https で e2e 検証済み）】Workers 上でログアウトしてもセッションが消えない**。真因は**独立した2つのバグ**で、両方に手当てが要った。
  - **切り分けの経緯**: サインアウト後もセッションが残る症状を Phase 3 で観測 → **現行 Vercel 本番ではログアウトが正常**と確認（＝Workers 固有、next-auth の cookie chunk 削除漏れ等ホスト非依存バグは棄却）→ http preview で「cookie 名の割れ」を発見 → `AUTH_URL` 設定で名前は統一されたが**別のバグが残存** → `workers.dev`(https) 実測で真因を確定。
  - **真因A: `AUTH_URL`/`NEXTAUTH_URL` 未設定による cookie-secure 名の割れ（→ AUTH_URL 設定で解消）**。ベース URL をリクエストヘッダから推定するが、workerd/OpenNext は edge（middleware）と node（route handler）でヘッダの入り方が異なり、各々別のベース URL → 別の `useSecureCookies` → 別の cookie 名/salt。Auth.js v5 は**セッション JWE を cookie 名で salt する**ため、書き手と読み手で secure/非secure 名が食い違うと**復号失敗で `null`**（「cookie が無い」ではなく「復号不能」）。http preview では `GET /api/auth/csrf` が `__Host-authjs.csrf-token` と `authjs.csrf-token` を1リクエストで両方セットしていた。→ **`AUTH_URL` を環境ごとに明示**（付録B）で解消。https workers.dev では csrf 名が `__Host-` に統一されることを確認。
  - **真因B: middleware の matcher が `/api/auth` を含み、Auth.js が二重実行される（→ matcher 除外で解消・ログアウト不能の直接原因）**。`middleware.ts` は `auth((req)=>{…})` でラップしており、**matcher にマッチした全リクエストで Auth.js を走らせ jwt セッション cookie を再発行（Set-Cookie）する**。旧 matcher `'/(api|trpc)(.*)'` は `/api/auth/signout` にもマッチするため、**route handler が出すセッション削除 Set-Cookie を middleware 側の再発行が打ち消す**。Vercel は cookie マージ順で削除が勝つため顕在化しないが、Workers/OpenNext では再発行が勝ってセッションが残る。**ログインが正常でログアウトだけ壊れる非対称**は、ログイン時は「まだセッションが無い」ため middleware の再発行と衝突しない（handler の SET が勝つ）のに対し、ログアウト時は既存セッションを middleware が再発行して handler の DELETE を潰すため。csrf が二重（別値）で出ていたのも同じ二重実行の副作用。
  - **確定した対策（実装済み・検証済み）**:
    1. **`middleware.ts` の matcher から `/api/auth` を除外**（真因B）: `'/((?!api/auth|.+\\.[\\w]+$|_next).*)'` と `'/(api(?!/auth)|trpc)(.*)'`。認証エンドポイントは route handler だけに cookie を触らせる。
    2. **`AUTH_URL` を環境ごとに設定**（真因A・付録B）: 本番 `https://www.abs-ems.logicode.tech`、workers.dev 検証 `https://abs-ems.<sub>.workers.dev`、ローカル preview `http://localhost:8787`。
    3. **ログアウトはクライアント `signOut`（`next-auth/react`, `/api/auth/signout` へ POST）**（`components/auth/logout-button.tsx`）。Server Action 版（`actions/logout.ts`, 削除済み）は**今いるページ経路に POST するため matcher にマッチ→真因B で潰される**ので使えない。matcher 除外後の `/api/auth/signout` のみが削除を確実に効かせられる。
  - **e2e 検証結果（workers.dev https, Neon ブランチ, 使い捨て AUTH_SECRET, 2026-07-05）**:
    - ログイン成功。middleware（`/ems/mypage` 遷移許可）・ページ描画・`/api/auth/session`（ユーザー返却）の**3者が一致**。
    - 手動 signout fetch（`/api/auth/signout`, `X-Auth-Return-Redirect`）→ POST 200 `{url}` → `/api/auth/session` が **`null`**（修正前はユーザーが残存）。
    - UI ボタン（アバター→ログアウト）→ `/auth/login` へ遷移し `session=null`。
    - `GET /api/auth/csrf` の Set-Cookie が **単一 `__Host-authjs.csrf-token`**（修正前は別値で2回。middleware がもう `/api/auth` の cookie を触らない確証）。
    - 未ログインで `/ems/mypage` → `/auth/login?callbackUrl=%2Fems%2Fmypage` へリダイレクト（**ページ保護は維持**）。
  - **残る cleanliness 項目（実害は未確認・非ブロッカー）**: middleware は `/ems/*` 等の保護ページでも auth() を走らせるため、ページ遷移ごとに session cookie を再発行しうる。ログアウトは `/api/auth/signout` 経由なので影響しないが、気になるなら matcher をさらに絞る余地あり。なお「`/api/auth/session` の `expires` が毎回前進する」のは**cookie 再発行の証拠ではない**（session エンドポイントは応答 body で常に `expires=now+maxAge` を再計算するため）。誤診しないこと。
- **AUTH_SECRET を変えない**。変更＝全ユーザー強制ログアウト。
- **Prisma は 6.19.x 固定**。7.0.0 は Workers で `Wasm code generation disallowed by embedder`（#28657、2026-07 時点 未解決）。6.16.x も CF 固有バグがあり避ける。
- **R2 `put()` は上書きされる**。キー一意化（`crypto.randomUUID()`）必須。
- **Prisma client はリクエストごと生成**。グローバル singleton は Workers で「Cannot perform I/O on behalf of a different request」を起こす。
- **Vercel Blob は S3 で直接読めない**。必ず `list()`＋公開 URL fetch でダウンロードしてから R2 へ。
- **既存 pathname のサフィックス有無を実データで確認**してから URL 書き換え SQL を打つ（`addRandomSuffix` 既定 false）。
- **next/image は Workers で自動最適化されない**。`unoptimized:true` か IMAGES バインディング／独自ローダー。
- **Serwist は仕様上ブラウザ側コードで無影響のはずだが公式の動作保証は無い**。デプロイ後に SW 登録／precache／オフラインを実測すること。
- **`compatibility_date` は 2025-04-01 以降**推奨（`process.env` 実行時反映・`FinalizationRegistry`）。
- **コスト**: Phase 1 実測で圧縮 **4.37 MiB gzip** → Free(3 MiB) 超過・**Workers Paid $5/月で確定**。ただし Hobby は商用不可で対抗馬は Vercel Pro $20 のため、CF $5 で安くなる（ADR「理由」参照）。

---

## 付録E: workers.dev(https) での認証サイクル検証手順

付録D の cookie 名不整合は **http preview では検証不能**。本番同等の https で「ログイン→session 一貫性→ログアウト」を確認するため、`workers.dev` サブドメインへ**検証専用デプロイ**を一度行う。本番ドメイン（DNS）は触らないので現行 Vercel には影響しない。

**方針**: 本番データに触れない・本番セッションと互換にしない。→ `DATABASE_URL` は **Neon ブランチ**、`AUTH_SECRET` は**使い捨て**。OAuth はこの検証では不要（Credentials 経路のみ）。

**前提**:
- **Workers Paid プラン**（バンドル 4.37 MiB > Free 3 MiB。未加入だとデプロイが弾かれる）。
- R2 バケット: `wrangler r2 bucket create abs-ems-images`（未作成なら。`wrangler.jsonc` の binding 先）。

**手順（デプロイは Daichi 本人が実施）**:
1. `wrangler login`（ブラウザ認証。セッション内なら `! wrangler login`）。
2. 使い捨て secret 投入:
   - `npx auth secret` 等で生成した値 → `wrangler secret put AUTH_SECRET`（**本番値は使わない**）。
   - Neon ブランチのプール URL（`ep-icy-wildflower-...-pooler`。`npx neonctl connection-string cloudflare-migration-test --pooled --project-id noisy-base-93247272` で取得）→ `wrangler secret put DATABASE_URL`。
   - `R2_PUBLIC_BASE_URL` は画像検証をしないならダミー可（`wrangler secret put` かダミー var）。
3. 初回 `wrangler deploy` → 出力の `https://abs-ems.<account-subdomain>.workers.dev` を控える。
4. **その URL を `AUTH_URL` に設定**（`wrangler.jsonc` の `vars` に一時追記か dashboard）→ 再 `wrangler deploy`。`AUTH_TRUST_HOST=true` も var で（`AUTH_URL` があれば trustHost は自動 true になるが明示しておく）。
5. **検証**（デプロイ後 URL を教えてもらえれば Claude-in-Chrome で私が実施可）:
   - `/auth/login` でテストユーザー `logout-probe@test.local`（ブランチに投入済み）でログイン。
   - `/api/auth/session` がユーザーを返す **かつ** 保護ルート `/ems/mypage` が 200（＝middleware と route handler が同じ session を見る）。
   - `GET /api/auth/csrf` の Set-Cookie が **単一**（https なので `__Host-authjs.csrf-token` 一本。二重で出ないこと＝割れ解消の確証）。
   - ログアウト → `/api/auth/session` が `null` **かつ** `/ems/mypage` が `/auth/login` へリダイレクトして留まる。
6. **判定（✅ 2026-07-05 実施・完了）**: 上記5項目すべて green を確認。**対策は `AUTH_URL` 環境別設定だけでは不十分**で、`middleware.ts` の matcher から `/api/auth` を除外（真因B）する必要があった。両方適用済み＝本番相当で確定（付録D の「確定した対策」参照）。当初想定した `auth.config.ts` での cookie 名明示ピン（フォールバック）は**不要だった**（真因A は `AUTH_URL` だけで解消）。
7. **後片付け**: 検証用 worker は `wrangler delete`、使い捨て secret も破棄。Neon ブランチは検証完了後に `npx neonctl branches delete cloudflare-migration-test --project-id noisy-base-93247272`。
