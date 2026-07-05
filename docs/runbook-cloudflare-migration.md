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
  get(_t, prop, recv) {
    const c = getDb();
    const v = Reflect.get(c as object, prop, recv);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
```

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

### 1-6. ローカル/プレビューで動作確認

- `.dev.vars` に実行時 secret と `NEXTJS_ENV=development` を置く。
- `npm run preview`（= `opennextjs-cloudflare build && ... preview`）で Workers ランタイム上でローカル検証。

> **✅ Phase 1 scaffold 実測結果（2026-07-05）**: `npm run cf:build` 成功（`next build` 型検査通過＋OpenNext 変換完了、Prisma も workerd 向けに正常バンドル）。**vitest 335 テスト全通過**。`wrangler deploy --dry-run` の圧縮アップロードサイズ = **gzip 4.37 MiB**（生 ~18 MiB）。→ **Free の 3 MiB 上限は超過、Paid の 10 MiB には余裕で収まる**。コストは既に「Vercel Pro $20 vs CF $5」で決着済みなので、Paid $5 で確定。

---

## Phase 2 — 画像を R2 へ（コード＋データ移行）

### 2-1. アップロードコード（`app/api/upload/route.ts`）

`@vercel/blob` の `put()` を R2 バインディングへ置換。`hasManagerAccess` ゲートは維持。

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
// ...
const ext = filename.includes(".") ? filename.split(".").pop() : "";
const key = `${sanitize(base)}-${crypto.randomUUID()}${ext ? "." + ext : ""}`;
const { env } = getCloudflareContext();
await env.IMAGES_BUCKET.put(key, req.body, {
  httpMetadata: { contentType: req.headers.get("content-type") ?? "application/octet-stream" },
});
const url = `https://img.example.com/${key}`;
return NextResponse.json({ url }); // 現行が返す blob.url 相当
```

> **応答形状の事前確認**: 上記は応答を `{ url }` に固定している。呼び出し側フック（`use-equipment-registration.ts` / `use-equipment-update.ts`）が **`.url` 以外（旧 Blob 応答の `pathname` / `downloadUrl` / `contentType` 等）を参照していないか**を先に確認してから、この形状に固定すること。参照していれば応答に足すか、フック側を直す。

> **落とし穴**: R2 の `put()` は**同一キーをエラー無しで上書き**する（Vercel Blob 1.0+ は同名でエラー）。現行の `addRandomSuffix: true` 相当を `crypto.randomUUID()`（Workers で利用可）で**必ず自前実装**。怠ると同名アップロードで既存画像が消える。

`next.config.mjs` の画像設定:

```js
images: {
  // domains は非推奨。remotePatterns へ
  remotePatterns: [
    { protocol: "https", hostname: "img.example.com" },
    { protocol: "https", hostname: "www.paypalobjects.com" }, // 既存で使っていれば残す
  ],
  unoptimized: true, // 開始時。next/image は Workers 上で自動最適化されない（下記）
}
```

> **next/image の最適化**: Workers 上では自動で効かない。効かせるには `IMAGES` バインディング（Cloudflare Images／課金）か独自ローダー（`/cdn-cgi/image`、ゾーンで Image Transformations 有効化）が要る。利用は2箇所のみなので、まず `unoptimized: true` で R2 から素配信し、必要なら後で最適化を足す。

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

---

## Phase 3 — Vercel 依存の切り離し

- **Speed Insights 削除**: `app/layout.tsx` の `<SpeedInsights />` と import を削除、`@vercel/speed-insights` を uninstall。代替が要れば Cloudflare Web Analytics（ただし**ルート別 Core Web Vitals は取れない**、サイト全体の指標のみ）。
- **Vercel Blob 依存削除**: `@vercel/blob` を uninstall。機材フックの `import type { PutBlobResult } from "@vercel/blob"`（`use-equipment-registration.ts` / `use-equipment-update.ts`）も削除し、返り値型を新しいアップロード応答（`{ url: string }`）に合わせる。
- **Resend**: SDK はそのまま Workers で動く。ただし `lib/mail.ts` は `const resend = new Resend(process.env.RESEND_API_KEY)` を**モジュール先頭で読む**。`RESEND_API_KEY` を**実行時 secret** として供給する（ビルド時 `NEXT_PUBLIC` にしない）。モジュール初期化時に凍結される懸念があれば、`resend` 生成を各関数内へ移す。
- **環境変数の移管**: [付録B](#付録b-環境変数マップ) の通り、実行時 secret を `wrangler secret put` / ダッシュボードへ。デプロイは `--keep-vars` でダッシュボード設定を消さない。

---

## Phase 4 — カットオーバー＆検証＆ロールバック

1. **本番 secret 投入**: `AUTH_SECRET` は**現行本番と同一値**（変えると既存の暗号化 JWE セッションが全て失効し全ユーザー強制ログアウト）。`AUTH_TRUST_HOST=true`。DB は プール URL（`DATABASE_URL`）＋直結（`DIRECT_URL`）。
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
| `next.config.mjs` | `images.domains`→`remotePatterns`（R2 ホスト）＋`unoptimized:true`、`serverExternalPackages` 追加、`withSerwist` は維持 |
| `app/api/upload/route.ts` | `@vercel/blob put` → `env.IMAGES_BUCKET.put`（一意キー＋contentType）、応答は `{ url }` |
| `app/layout.tsx` | `<SpeedInsights/>` と import 削除 |
| `use-equipment-registration.ts` / `use-equipment-update.ts` | `PutBlobResult` 型 import 削除、応答型を `{ url }` に |
| `lib/mail.ts` | `RESEND_API_KEY` を実行時 secret として供給（必要なら関数内読みへ） |
| `middleware.ts` | 現状維持（任意で auth.config から bcrypt/Prisma を分離しバンドル削減） |
| OAuth コンソール | Google / GitHub にコールバック URL 追加 |

---

## 付録B: 環境変数マップ

| 変数 | 区分 | 移行先 |
|---|---|---|
| `AUTH_SECRET` | 実行時 secret | wrangler secret（**現行本番と同一値**） |
| `AUTH_TRUST_HOST` | 実行時 var | `true`（新規。Workers は Auth.js 自動信頼対象外） |
| `DATABASE_URL` | 実行時 secret | wrangler secret（**プール URL**、`-pooler`） |
| `DIRECT_URL` | 実行時 secret | wrangler secret（**直結 URL**、migrate 用。新規） |
| `GOOGLE_CLIENT_ID` / `_SECRET` | 実行時 secret | wrangler secret |
| `GITHUB_CLIENT_ID` / `_SECRET` | 実行時 secret | wrangler secret |
| `RESEND_API_KEY` | 実行時 secret | wrangler secret（`lib/mail.ts` で使用） |
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

- [ ] Credentials ログイン（`bcrypt.compare` ＋ 2FA 経路）
- [ ] Google ログイン
- [ ] GitHub ログイン（`@auth/prisma-adapter` の linkAccount 経路）
- [ ] middleware で保護されたルートのリダイレクト挙動
- [ ] サインアウト（JWE セッションの往復）
- [ ] 予約 CRUD（`lib/reservation-overlap.ts` の重複チェック含む）
- [ ] 機材／タグ CRUD（`hasManagerAccess` ゲート＝`NEXT_PUBLIC_MANAGER_KEY` 経路も）
- [ ] 画像アップロード（新規、R2 に入る＋一意キー）
- [ ] 既存画像が next/image で R2 から表示（remotePatterns 未登録だと `next-image-unconfigured-host`）
- [ ] PWA: `/sw.js` 登録、precache が 200、オフライン遷移、SW 更新サイクル
- [ ] メール送信（2FA / リセット / 確認）
- [ ] Worker 圧縮サイズが上限内（Free 3 MiB / Paid 10 MiB）

---

## 付録D: 既知の落とし穴（敵対的検証で確認済み）

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
