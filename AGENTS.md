# AGENTS

このリポジトリで作業する AI エージェント（Claude Code / Cursor / Codex など）向けの共通入口。
ツールに依存せず適用する。

> abs-ems は **プロダクト開発リポジトリ**（学内放送部の機材予約システム）。
> `my-project-template` の3層モデルを、研究向け要素（Papers / Experiment Log / dev-assets）を
> 除いたプロダクト向け構成で適用している。

## 最優先ルール：3層モデル

正本（single source of truth＝唯一の公式な置き場所）は **Notion / GitHub / Google Drive** の3層に分かれる。

- **Notion = 思考と知識の母艦**：タスク、検討中の考え・失敗理由・振り返り、再利用ナレッジ
- **GitHub repo = コード＋コードに同期すべき最小限の確定文書**：code・設定、ADR、開発フロー（CONTRIBUTING）、branches/tags
- **Google Drive = 大容量バイナリ＆資料**：このプロジェクトでは現在ほぼ未使用（必要になったら導入）

→ 詳細と URL：[`agents/sources-of-truth.md`](agents/sources-of-truth.md)
→ どこに何を置くか（決定表）：[`docs/README.md`](docs/README.md)

## 作業時の基本方針

- **タスクは Notion の ☑️ ToDo が正本**。GitHub Issues に二重に作らない。
- **git のブランチ/タグ運用は [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) に従う**（戦略の正本は Notion。→ [`agents/workflow.md`](agents/workflow.md)）。
- **確定した技術判断は ADR** として [`docs/decisions/`](docs/decisions/) に残す。
- 流動的な検討・失敗理由・振り返りは Notion に書き、repo（コミットメッセージ・ADR）からはリンクする。
- 確定した設計・技術判断・運用手順だけ repo の `docs/` に置く。
- **Notion（散文・思考）は「表現は本人寄り・中身は不足を補う」の二面で書く**（→ [`agents/notion.md`](agents/notion.md)）。

## 詳細ルール

- [`agents/sources-of-truth.md`](agents/sources-of-truth.md) — 3層モデルと Notion URL の正本
- [`agents/workflow.md`](agents/workflow.md) — git ブランチ/タグ戦略（正本へのポインタ＋repo 固有差分）
- [`agents/notion.md`](agents/notion.md) — Notion 操作規約
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 開発フロー・ブランチ/タグ運用・テスト規約の詳細
