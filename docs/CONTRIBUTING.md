# コントリビューションガイド

abs-ems の開発フロー・ブランチ運用・タグ運用ルールをまとめます。基となる戦略は Notion の [Gitブランチ戦略ベストプラクティス](https://www.notion.so/d0c1aee52da245b1a33fb0b35e7a53f4) を参照してください。

> abs-ems はプロダクト開発リポジトリです。研究向けに用意されている `experiment/` ブランチや `paper/` / `archive/` tag は「枠として用意するが普段は使わない」位置付けで、主な運用は `release/` tag と `feat/` / `fix/` / `hotfix/` ブランチです。

## コア原則

- `main` は常に「他人に見せられる安定状態」だけを置く
- `develop` で日常開発を統合し、`main` への一括反映で履歴を綺麗に保つ
- 機能改修 (`feat/`) と実験 (`experiment/`) を明確に分離する
- 失敗 `experiment/` ブランチは削除前に **archive tag を打って永続化** する

## ブランチ構成

| ブランチ | 役割 | マージ先 | 寿命 |
|---|---|---|---|
| `main` | 公開・本番運用可能な安定状態のみ。`release/` tag でマイルストーンを固定 | — | 永続 |
| `develop` | 日常開発・修正の統合先。最新の動く状態 | `main` | 永続 |
| `feat/xxx` | 機能追加・大規模リファクタ | `develop` | マージ後削除 |
| `fix/xxx` | `develop` 上で見つかったバグ修正 | `develop` | マージ後削除 |
| `hotfix/xxx` | `main`（本番運用中）の緊急バグ修正。`main` と `develop` の両方に反映 | `main` & `develop` | マージ後削除 |
| `experiment/xxx` | 探索的試行（プロダクトでは基本不使用） | `develop`（成功時のみ） | 終了後に削除 |

### ブランチを切る基準

- `src/` 配下のコードを変更する場合は **必ずブランチを切る**
- `README.md` や設定ファイルの軽微な修正は `develop` 直接でも可
- 「本筋の改修か、探索か？」で `feat/` か `experiment/` を判断

## マージ基準

### `develop` → `main`

- ✅ 一区切りつくマイルストーンに到達（リリース、機能完成、デモ完成 など）
- ✅ アプリケーション全体が壊れていない（手動 / 自動テストが通る）
- ✅ ハードコード・デバッグ用一時コードが残っていない
- ✅ README と設定ファイルが最新の挙動を反映
- ❌ コードが半壊している、結果の意味を理解できていない

### `feat/xxx` → `develop`

- ✅ 旧実装との比較・回帰テストが完了
- ✅ 関連ドキュメント・設定ファイルを更新
- ✅ レビュー or セルフレビュー済み

### `experiment/xxx` → `develop`（成功時のみ）

- ✅ 有意な結果が出て、本筋に取り込む価値があると判断できる
- ❌ 失敗 / 没 → マージしない。`archive/exp-...` tag を打ってからブランチ削除（[失敗 experiment の削除](#失敗-experiment-の削除archive-tag--削除) 参照）

## ブランチ削除ルール

| ブランチ | 削除タイミング | archive tag | 理由 |
|---|---|---|---|
| `feat/` | `develop` へのマージ後 | 不要 | コードは `develop` に残る |
| `experiment/`（成功） | `develop` へのマージ後 | 不要 | コードは `develop` に残る |
| `experiment/`（失敗・没） | 実験終了時 | **必須** | マージしていないため tag が唯一のアンカー。tag を打たずに削除すると最終的に GC で commit が消える |
| `fix/` / `hotfix/` | マージ後 | 不要 | コードは反映先に残る |

### マージ済みブランチの削除

```bash
# ローカル
git branch -d feat/new-pipeline
# リモート
git push origin --delete feat/new-pipeline
```

### 失敗 experiment の削除（archive tag → 削除）

ブランチを消すだけだと commit は到達不能になり、`reflog` の保持期間（デフォルト約 90 日）を過ぎると `git gc` で完全消失する。tag を打てば GC 対象外になる。

```bash
# ① archive tag を打つ（annotated。失敗理由・関連 URL などをメッセージに残す）
git tag -a archive/exp-2026-05_focal-loss experiment/focal-loss \
  -m "Focal loss ablation: did not improve over baseline.
      See: https://notion.so/<page-id>"

# ② リモートにも push（必須：ローカルだけだと PC 紛失で終わる）
git push origin archive/exp-2026-05_focal-loss

# ③ ブランチ削除（マージされていないため -D で強制削除）
git branch -D experiment/focal-loss
git push origin --delete experiment/focal-loss
```

### tag からの復元・参照

```bash
git tag -l 'archive/*'                            # アーカイブ tag を一覧
git show archive/exp-2026-05_focal-loss           # tag メッセージ + 該当 commit を表示
git switch -c restored/focal-loss archive/exp-2026-05_focal-loss  # ブランチとして復元
```

## 命名規則

| パターン | 例 |
|---|---|
| `feat/<短い説明>` | `feat/bulk-reservation`, `feat/refactor-loader` |
| `fix/<短い説明>` | `fix/date-input-padding`, `fix/cli-arg-parse` |
| `hotfix/<短い説明>` | `hotfix/login-crash` |
| `experiment/<YYYY-MM-DD>_<内容>` | `experiment/2026-05-19_new-algo` |

- 日本語禁止。kebab-case で短く具体的に
- `experiment/` は **日付プレフィックス** を付けて、削除後にログから探しやすくする

## タグ運用

tag は branch より管理が軽い（静的なポインタ、`git gc` 対象外、push 可能、message に情報を残せる）。`main` のマイルストーンと、失敗 `experiment/` のアーカイブの両方で使う。

### 命名規則（namespace 設計）

| パターン | 用途 | 例 |
|---|---|---|
| `release/vX.Y` | コードベースのバージョン | `release/v1.0`, `release/v1.2.1` |
| `milestone/<name>` | 意味のある区切り（機能完成・既存システムからの移行完了など） | `milestone/strategy-migration`, `milestone/auth-rewrite` |
| `paper/<conf-year>` | （研究用途）論文投稿時点の確定版 | `paper/icml2026-submission` |
| `archive/exp-<YYYY-MM>_<内容>` | 失敗 `experiment/` の永続アーカイブ | `archive/exp-2026-05_focal-loss` |

### マイルストーン tag を打つ

`main` にマージしたタイミングで、意味のある区切りには必ず annotated tag を打つ。

```bash
git tag -a release/v1.2              -m "Release v1.2: 機能 X 追加"
git tag -a milestone/auth-rewrite    -m "認証基盤刷新完了"
git push origin --tags
```

- 「この tag の状態が公式な結果です」と第三者（ユーザー・チーム）に示せる
- tag は **不変** として扱う。一度 push したら書き換えない（下流の clone が壊れる）

### tag を検索・一覧する

```bash
git tag -l 'release/*'    # リリース系だけ
git tag -l 'milestone/*'  # マイルストーン系だけ

# 日付・メッセージ込みで一覧（一番よく使う）
git for-each-ref refs/tags \
  --format='%(refname:short) | %(creatordate:short) | %(subject)' \
  --sort=-creatordate
```

## コミットメッセージの粒度

| ブランチ | 粒度の目安 | 例 |
|---|---|---|
| `experiment/` | 荒くて OK。試行錯誤を記録 | `wip: trying new layout` |
| `feat/` / `fix/` | 機能単位。Conventional Commits 推奨 | `feat: add bulk reservation`<br>`fix: date input padding overflow` |
| `develop` | マージコミット中心 | `Merge feat/new-pipeline into develop` |
| `main` | 丁寧に。結果・バージョンも書く | `feat: bulk reservation (v1.2)` |

`main` のコミット履歴は **1 年後の自分・新規メンバー** が読むつもりで書く。

### Conventional Commits 略式

- `feat:` 新機能
- `fix:` バグ修正
- `refactor:` 挙動を変えないリファクタ
- `docs:` ドキュメントのみ
- `test:` テストのみ
- `chore:` ビルド・依存関係・設定など
- `wip:` 作業中（`experiment/` 限定）

## 典型ワークフロー

### 新機能を追加する

```bash
git switch develop
git pull
git switch -c feat/new-feature
# ... 作業 & コミット ...
git push -u origin feat/new-feature
gh pr create --base develop --title "feat: new feature"
# PR がマージされたら
git switch develop && git pull
git branch -d feat/new-feature
```

### `main` へリリースする

```bash
git switch main
git pull
git merge --no-ff develop
git tag -a release/v1.2 -m "Release v1.2: feature X added"
git push origin main --tags
```

### `main` の緊急修正（hotfix）

```bash
git switch main
git switch -c hotfix/critical-bug
# ... 修正 ...
git push -u origin hotfix/critical-bug
gh pr create --base main --title "hotfix: critical bug"
# main にマージ後、tag を打つ
git switch main && git pull
git tag -a release/v1.2.1 -m "Hotfix: critical bug"
git push origin --tags
# develop にも反映
git switch develop && git pull
git merge --no-ff hotfix/critical-bug
git push
git branch -d hotfix/critical-bug
git push origin --delete hotfix/critical-bug
```

## テスト

`schemas/`, `lib/`, `data/`, `actions/`, `hooks/` のピュアロジック層は Vitest でユニットテストを書く方針。

### 実行コマンド

```bash
npm test            # 一度だけ実行（CI 用途）
npm run test:watch  # ファイル変更を監視して再実行
npm run test:ui     # ブラウザ UI で結果を確認
```

### 配置規約

テストはソースの隣にコロケーションで置く（`*.test.ts`）。例:
```
schemas/index.ts
schemas/index.test.ts
actions/login.ts
actions/login.test.ts
```

### モック方針

- Prisma (`@/lib/db`): 各テストファイル先頭で `vi.mock` してメソッドを個別に stub
- NextAuth (`@/auth`, `next-auth`): `signIn` や `AuthError` はモックで提供（実体を読み込むと `next/server` の解決に失敗する）
- メール (`@/lib/mail`): `vi.fn()` で送信を no-op に
- `next-auth/react` の `useSession`: hooks テストで `vi.mock` + `renderHook`

詳細な例は [actions/login.test.ts](../actions/login.test.ts) を参照。

### 何を書くか / 書かないか

- ✅ **書く**: Zod スキーマのバリデーション分岐、Server Action の各エラーパス、Prisma を呼ぶ data 層、純粋関数
- ⚠️ **後回し**: UI コンポーネント（Phase 2 以降で snapshot / interaction テストを追加予定）

## 補足

- 詳細な背景・図解・研究向けケースは Notion の [Gitブランチ戦略ベストプラクティス](https://www.notion.so/d0c1aee52da245b1a33fb0b35e7a53f4) を参照
- 戦略適用前の状態は tag `release/v1.0` で固定済み（移行のベースライン）
