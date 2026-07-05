# ADR-001: Vercel 上の Next.js モノリスを Cloudflare(OpenNext)＋R2 へ移行し、FastAPI 分割は採らない

- Status: Proposed
- Date: 2026-07-05

## 背景

現状 abs-ems は **Next.js 15.5（App Router）モノリス**で、Vercel にデプロイしている前提の構成になっている。

- 認証: next-auth (Auth.js) v5.0.0-beta.31、`session.strategy = "jwt"`。Credentials(bcryptjs)＋Google＋GitHub。2要素認証・メール確認・パスワードリセットまで自前（`actions/`）。
- データ: Prisma v5.13 ＋ `@neondatabase/serverless`、Postgres は **Neon**。スキーマは小さい（User / Account / 各種 token / List / Reserve / Tag）。
- バックエンドの実体: `app/api` のルートハンドラ（lists / reserves / tags / users / admin / upload）＋ Server Actions。**独立したバックエンドサービスは無い**。
- 画像: **Vercel Blob**（`@vercel/blob` の `put`）。公開 URL を DB（`List.image`）に保存。
- その他: Vercel 依存として `@vercel/speed-insights`。PWA は Serwist、メールは Resend。

当初の希望は「フロント=Cloudflare Pages / バック=FastAPI on Cloudflare Containers / DB=Neon / 画像=R2」への全面刷新だった。しかし **狙いは「Vercel からの脱出・Cloudflare への集約・コスト」であり、Python/FastAPI 化そのものは目的ではない**ことを確認した（方針決定 2026-07-05）。この前提に立つと、動いている TypeScript バックエンドを Python へ書き直す作業は移行の中で最も高コストかつ本来不要になる。

## 検討した案

### 案A: 現状維持（Vercel のまま）
- メリット: 変更ゼロ・リスクゼロ。
- デメリット: Vercel 集約から離れられない。Vercel Blob の egress 課金が残る。Hobby プランは「個人・非商用」の制約があり、学内クラブの内部ツールが該当するかグレー。

### 案B: モノリスのまま Cloudflare へ軽量移行（本 ADR の採用案）
- Next.js モノリスを `@opennextjs/cloudflare`（Cloudflare Workers）へ載せる。
- 画像を **Vercel Blob → R2** に移す（既存画像のデータ移行込み）。
- **DB は Neon 据え置き**。認証・予約ロジックは TypeScript のまま維持。
- FastAPI・Cloudflare Containers は**採用しない**。
- メリット: バックエンドの言語書き直しゼロ。認証境界の再設計が不要。最短・低リスク。
- デメリット: OpenNext / Prisma-on-Workers に固有の作業（後述「影響」）が発生する。コスト削減は限定的。

### 案C: フロント／バック分割（当初案：Next＋FastAPI on Containers）
- フロント Next.js（Cloudflare）＋バック FastAPI（Cloudflare Containers）に分割。Prisma → Python の ORM（SQLAlchemy 等）へ。
- デメリット（不採用理由の核心）:
  - **TS バックエンドの Python 全面書き直し**（予約重複ロジック等）＝最大の工数で、狙い（脱 Vercel／集約）には不要。
  - **認証の分割が難所**。next-auth v5 のセッションは単なる署名 JWT ではなく **暗号化トークン（JWE、AUTH_SECRET から HKDF 派生）**。FastAPI 側で素直に検証できず、「Next を認証の親元に残し、バック向けに別トークンを発行→FastAPI が検証」等の再設計を強いられる。
  - Cloudflare Containers という運用対象（Dockerfile・課金・コールドスタート）が増える。
- この小規模な内部ツールには過剰。Python バックエンド自体が目的になった時点で再検討する。

## 決定

**案B を採用する。** Next.js モノリスを維持したまま `@opennextjs/cloudflare` で Cloudflare Workers へ移行し、画像を R2 へ移す。DB は Neon 据え置き。**FastAPI 分割・Cloudflare Containers は採らない。**

技術判断の要点（一次ソースで検証済み。詳細な手順は [`../runbook-cloudflare-migration.md`](../runbook-cloudflare-migration.md)）:

- **アダプタは `@opennextjs/cloudflare`（Workers）**。旧 `@cloudflare/next-on-pages`（Pages）は非推奨・リポジトリはアーカイブ済み（2025-09-29）。App Router / Server Actions / Route Handlers / middleware / SSR ストリーミングはサポート対象。
- **Prisma は 5.13 → 6.19.x へ上げる**。Workers ではドライバアダプタ `@prisma/adapter-neon` が必須（6.19 で driverAdapters は GA）。generator は `prisma-client-js` のままで可、`lib/db.ts` を per-request 化＋後方互換 Proxy にするだけで済む（**import 総差し替えは不要と Phase 1 で実証**）。**Prisma 7.0.0 は Workers で未解決の WASM 不具合（#28657）があり避ける**。
- **認証は bcrypt を維持**（別方式へ替えると既存パスワードが全て無効化される）。ただし **bcryptjs は 2.4.3 → 3.x へ上げる**（2.4.3 は workerd 上で salt/hash 生成の乱数源が不安定。ハッシュ形式は不変なのでパスワード再設定は不要）。
- **画像は R2 バケットバインディング**でアップロード。**R2 の `put()` は同一キーをエラー無しで上書きする**ため、`crypto.randomUUID()` でキーを一意化する（怠ると同名アップロードで既存画像が消える）。配信は r2.dev ではなく**カスタムドメイン**。

## 理由

- 狙いが「脱 Vercel・集約・コスト」であり **FastAPI 化は目的ではない**ため、最大コストの言語書き直しを避けられる案Bが目的に最短で合致する。
- 認証（next-auth）が Next.js と Prisma に深く結合しており、分割は JWE トークンの検証境界を作り直す設計コストを生む。モノリス維持ならこの難所を回避できる。
- バックエンドのドメインロジックは小さく（予約重複チェックは `lib/reservation-overlap.ts` 57行程度）、独立サービス化の便益が薄い。
- Neon 据え置きにより DB 移行リスクが無い。`@neondatabase/serverless`（HTTP/WebSocket）は Workers ランタイムと相性が良い。

**コストの位置づけ（確定）:** この低トラフィック規模ではリクエスト/CPU 課金には届かない。Free と Paid を分けるのは実質「圧縮後の Worker バンドルが 3 MiB を超えるか」だけで、OpenNext のバンドルは超えやすく **Workers Paid（月 $5）が現実的な下限**。

現状は Vercel **Hobby（無料）**だが、**Hobby は商用利用が禁止**されており、本システム（学内クラブの運用ツール）を継続するなら本来 **Vercel Pro（$20/人・月）**へ上げる必要がある。したがって現実的な比較は「無料 vs $5」ではなく **「コンプライアンス上必要な Vercel Pro $20 vs Cloudflare ~$5」**であり、**Cloudflare 側が月およそ $15 安く、かつ Hobby の非商用制約も同時に解消する**。加えて R2 は egress（下り転送）無料。よってコスト・コンプライアンス両面で移行が正当化される。

## 影響

コード・運用に生じる主な変更（フェーズ分けと手順は runbook 参照）:

- **依存**: `+@opennextjs/cloudflare` `+wrangler` `+@prisma/adapter-neon`、`prisma`/`@prisma/client` を `^6.19` へ、`bcryptjs` を `^3` へ。`-@vercel/blob` `-@vercel/speed-insights`。
- **新規設定ファイル**: `wrangler.jsonc`（`nodejs_compat` ＋ `global_fetch_strictly_public`、`compatibility_date` は 2025-04-01 以降推奨、assets / r2_buckets バインディング）、`open-next.config.ts`。
- **Prisma**: 5.13 → 6.19.x（generator は `prisma-client-js` のまま）。`lib/db.ts` を **per-request 生成＋後方互換 Proxy** へ書き換え（Workers は接続の使い回し禁止）。**呼び出し側・import は無改修**（約30ファイル、`@auth/prisma-adapter` 連携含む。当初想定の import 総差し替えは不要と Phase 1 で実証）。
- **画像**: `app/api/upload/route.ts` を R2 バインディング＋一意キーへ。`next.config.mjs` の `images.domains` を `images.remotePatterns`（R2 ホスト）へ、開始時は `images.unoptimized: true`（利用は2箇所のみ）。
- **Vercel 切り離し**: `app/layout.tsx` の `<SpeedInsights/>` 削除、機材フックの `import type { PutBlobResult }` 削除、`lib/mail.ts` は `RESEND_API_KEY` をモジュール先頭で読むため**実行時 Worker secret として供給**されるか要確認（必要なら関数内読みへ）。
- **環境変数**: 実行時 secret（`AUTH_SECRET` / `DATABASE_URL` / OAuth secret / `RESEND_API_KEY`）は `wrangler secret` / ダッシュボードへ。`NEXT_PUBLIC_*` はビルド時インライン。**`NEXT_PUBLIC_MANAGER_KEY` はローカル `.env` に無く Vercel 側にしか無い可能性が高いので、移行時は「ローカル .env でなく Vercel の全環境変数」を棚卸しする**。デプロイは `--keep-vars`。
- **認証の運用**: `AUTH_SECRET` は現行本番と**同一値**を設定（変えると既存の暗号化セッションが全て失効し全ユーザーが強制ログアウト）。`AUTH_TRUST_HOST=true`（Workers は Auth.js の自動信頼対象外）。Google/GitHub の**コールバック URL を新ドメインに追加**。
- **データ移行**: Vercel Blob は S3 互換エンドポイントを持たないため、SDK の `list()`＋公開 URL fetch でダウンロード → rclone で R2 へ → Neon の `List.image` をホスト差し替え SQL で書き換え。**既存 pathname にランダムサフィックスが実在するかを実データで先に確認**（`addRandomSuffix` の既定は false）。
- **リスク / ロールバック**: カットオーバー確定までは Vercel を残し、可逆点は DNS/ドメイン切替。Worker サイズが上限超過なら Paid か bundle 削減。Prisma は 6.19.x に固定。

## 参考（Notion / commit / tag）

- 手順書: [`docs/runbook-cloudflare-migration.md`](../runbook-cloudflare-migration.md)
- 流動的な検討・振り返りは Notion プロジェクトページが正本（URL の正本 → [`../../agents/sources-of-truth.md`](../../agents/sources-of-truth.md)）
- 一次ソース（本 ADR の判断根拠、2026-07 時点で検証）:
  - OpenNext for Cloudflare — https://opennext.js.org/cloudflare （overview / get-started / bindings / howtos / troubleshooting / known-issues）
  - Cloudflare Workers Next.js フレームワークガイド — https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
  - `next-on-pages` 非推奨・アーカイブ — https://github.com/cloudflare/next-on-pages
  - Prisma × Cloudflare Workers / Neon — https://www.prisma.io/docs/guides/cloudflare-workers, https://www.prisma.io/docs/orm/overview/databases/neon
  - Prisma 7 の Workers WASM 不具合 — https://github.com/prisma/prisma/issues/28657
  - Auth.js デプロイ（AUTH_SECRET / AUTH_TRUST_HOST）— https://authjs.dev/getting-started/deployment
  - R2 公開バケット / 料金 — https://developers.cloudflare.com/r2/buckets/public-buckets/, https://developers.cloudflare.com/r2/pricing/
  - Workers 料金 / 制限 — https://developers.cloudflare.com/workers/platform/pricing/, https://developers.cloudflare.com/workers/platform/limits/
