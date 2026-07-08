---
name: verify
description: >
  abs-ems の変更をローカルで実際に動かして検証する手順。API（要認証）と
  マイページ UI をエンドツーエンドで叩くためのレシピ。
---

# abs-ems の動作検証レシピ

## 前提

- `.env` の DATABASE_URL は dev DB（`abs-ems`）。本番は `.env.production.local` に隔離されている。
- `npm run build` を実行した後に dev を起動する場合は `rm -rf .next` してから（キャッシュ破損防止）。

## 起動

```bash
rm -rf .next && npm run dev > /tmp/dev-server.log 2>&1 &
# 起動待ち: curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login が 200
```

## 認証付き API を curl で叩く

1. **テストユーザー作成**（dev DB に直接 upsert。email 検証をスキップできる）:
   `@prisma/client` + `bcryptjs` の .mjs スクリプトをリポジトリ直下に置き
   `node --env-file=.env script.mjs` で実行（scratchpad からだと node_modules を解決できない）。
   `password: await bcrypt.hash(..., 10)`, `emailVerified: new Date()` をセット。
2. **ログイン**（NextAuth credentials の REST フロー）:
   ```bash
   CSRF=$(curl -s -c jar http://localhost:3000/api/auth/csrf | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
   curl -s -b jar -c jar -X POST http://localhost:3000/api/auth/callback/credentials \
     -d "csrfToken=$CSRF" -d "email=..." -d "password=..."   # 302 が成功
   curl -s -b jar http://localhost:3000/api/auth/session      # セッション確認
   ```
3. あとは `-b jar` を付けて API を叩く。未認証の API アクセスは middleware が
   `/auth/login` へ 302 する（401 JSON ではない）ことに注意。

## UI 検証

claude-in-chrome で `http://localhost:3000/ems/mypage` 等を開く。ユーザーの Chrome には
本人の dev セッションが残っていることが多く、そのまま閲覧検証できる（データを変更する
確定ボタンは押さないこと）。

## 後片付け

- テストユーザー・テスト機材・その予約を Prisma スクリプトで削除（機材名を
  「検証用機材(削除可)」等にしておくと安全に消せる）。
- `pkill -f "next dev"`、cookie jar 削除。

## ドメイン知識（検証シナリオ設計用）

- 予約は日単位（JST 日付の UTC 00:00 保存）。`isRenting`: 0 予約中 / 1 受取可 /
  2 貸出中 / 3 滞納 / 4 返却済。
- 「借りる」(PATCH isRenting:2) は JST 今日が start〜end 内のときのみ成功する。
- 重複チェックは返却済(4)を空き扱いにする（早期返却で残り期間が解放される）。
- 延長は `PATCH /api/reserves/[id]/extend` に `{"end":"YYYY-MM-DD"}`。

## トラブルシュート

- **5432/TCP 直結が通らない**ことがある（ネットワーク依存）。スクリプトから dev DB に
  つなぐときは lib/db.ts と同じ WebSocket(443) 経由にする:
  ```js
  import { PrismaNeon } from "@prisma/adapter-neon";
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  ```
- dev サーバー起動前に **port 3000 の残プロセス**を確認（`lsof -i :3000`）。取られていると
  3002 で起きて、3000 側の古いサーバー（.next 削除済みで壊れている）を叩いてしまう。
- ブラウザ検証で「ユーザーの localhost セッションを壊したくない」ときは **http://127.0.0.1:3000**
  を使う（cookie がホスト単位で分離され、別セッションでログインできる）。

## dev でのアカウント新規登録

`next dev` には Workers の EMAIL バインディングが無いため、確認メールは送信されず
**確認リンクが dev サーバーの端末ログに出る**（lib/mail.ts の [mail:dev] フォールバック）:

```
grep "mail:dev" <devサーバーのログ>   # Confirm your email: http://localhost:3000/auth/new-verification?token=...
```

リンクを開けばメール認証が完了し、ログインできる。リンクのホストが localhost になるのは
`.env.development.local` の NEXT_PUBLIC_APP_URL（next dev 専用オーバーライド）による。
