# Sources of Truth（3層モデル）

このリポジトリのドキュメント・データ・タスクは **3つの層** に分かれて管理される。
repo は「全部の家」ではなく、3層のうちの1つにすぎない。
**どこに何を置くかの完全な判断基準は [`../docs/README.md`](../docs/README.md) を参照。**

このファイルは **Notion 各ハブ URL の唯一の正本**。他のファイルはここにリンクし、URL をコピーしない
（DB が移動したらここ1箇所だけ直す）。

## 3層の役割

| 層 | 役割 | 正本となるもの |
|---|---|---|
| **Notion** | 思考と知識の母艦（cross-repo・永続・流動的） | タスク、検討中の考え・失敗理由・振り返り、再利用ナレッジ |
| **GitHub repo** | コード＋コードに同期すべき最小限の確定文書 | code・設定、ADR、開発フロー（CONTRIBUTING）、branches/tags |
| **Google Drive** | 大容量バイナリ＆人間向け資料 | このプロジェクトでは現在ほぼ未使用（下記） |

> 反転ポイント：**GitHub をテキストの何でも置き場にしない**。
> 生きた検討・振り返りテキストは Notion を正本にし、repo からはリンクするだけ。

## Google Drive の扱い（このプロジェクトでは現在未使用）

- **`dev-assets`**（プロジェクト付随の大容量バイナリ）: abs-ems は Web アプリでデータは
  DB（Prisma）にあるため未使用。大容量ファイルを扱う必要が出たら
  `my-project-template` の `scripts/setup_data.sh` / `agents/dev-assets.md` を導入する。
- **`~/My Drive/Documents/`**: 人間向けの資料・書類の置き場。部活関連の資料があればここ。
- **機密（本番環境の認証情報・契約等）**: repo にも Notion にも置かない（`.env` は gitignore 済み）。

## Notion ハブ URL（唯一の正本）

| ハブ / DB | 用途 | URL |
|---|---|---|
| ☑️ ToDo（DB） | タスク（Private/Research/Career/Work、ダッシュボード付き） | https://app.notion.com/p/31f1c1f16e8980428975d40f87da2466 |
| Tech Knowledge Base（DB） | 再利用可能な技術ガイド | https://app.notion.com/p/bb73970063dd4745b97f8261628cdb56 |
| Git ブランチ戦略（Tech KB 内） | git 運用の正本 | https://app.notion.com/p/d0c1aee52da245b1a33fb0b35e7a53f4 |

> 研究用ハブ（Research Log / Papers / Experiment Log）はこのプロダクト repo では使わない。
> URL が必要な場合は `my-project-template` の `agents/sources-of-truth.md` を参照。

## このプロジェクトの Notion ページ

- プロジェクトページ: []()
