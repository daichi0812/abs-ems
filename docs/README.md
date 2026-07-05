# docs — このリポジトリのドキュメント

この `docs/` には、**コードと一緒に version すべき確定文書だけ** を置く。
タスク・検討中の考え・再利用ナレッジは Notion が正本（→ [3層モデル](../agents/sources-of-truth.md)）。

## どこに何を置くか

「ある文書/データをどこに置くか」を迷ったら、まず **タイブレーカー3原則** で判定する。
これで gray zone（どちらとも言えない中間ケース）の大半は決定表を引かずに解決する。

> **タイブレーカー（迷ったらこの順で判定）**
> 1. **小さく diff できる** テキスト/設定 → **GitHub repo**（この `docs/` かコード）
> 2. **大きい or バイナリ** → **Google Drive**（このプロジェクトでは現在ほぼ未使用）
> 3. **解釈・物語・思考**（なぜ / 結論 / 失敗理由 / 振り返り） → **Notion**

### 配置の決定表

| 内容 | 正本（置き場所） | 補足 |
|---|---|---|
| コード・設定 | repo | |
| 技術スタック一覧（何を使っているか） | repo `README.md` | 選定理由は ADR、ノウハウは Notion Tech KB |
| 開発フロー・ブランチ/タグ運用・テスト規約 | repo `docs/CONTRIBUTING.md` | 戦略の正本は Notion（→ [`../agents/workflow.md`](../agents/workflow.md)） |
| 技術判断（ADR・commit に紐づく） | repo `docs/decisions/` | |
| コードに同期する設計ドキュメント | repo `docs/` | 必要になったら `design.md` を作る |
| 運用手順（デプロイ・DB マイグレーション等） | repo `docs/` | 必要になったら runbook を作る |
| README 用のスクリーンショット・小さな図版 | repo `public/readme/` | |
| タスク・ToDo | Notion **☑️ ToDo** | GitHub Issues は既定で使わない |
| 検討中の考え・失敗理由・振り返り | Notion **プロジェクトページ** | 流動的でよい。repo からはリンクする |
| 再利用可能な技術ノウハウ | Notion **Tech Knowledge Base** | repo 横断 |
| 大容量データ・バイナリ | Google Drive **dev-assets** | 現在未使用。必要になったらテンプレートから導入 |
| 機密（`.env`・本番認証情報・契約等） | repo / Notion 外 | `.env` は gitignore 済み。共有が必要なら Drive 等の安全な場所 |

> Notion 各ハブの URL は [`../agents/sources-of-truth.md`](../agents/sources-of-truth.md) を参照（URL の正本はそこ1箇所）。

### gray zone の例（上の規則で一意に決まる）

- **「なぜ next-pwa から Serwist に移行したか」** → repo `docs/decisions/`（ADR。確定した技術判断）
- **「一括貸出機能をどう作るか迷っている」** → Notion プロジェクトページ（流動的な検討）
- **テストのモック方針** → repo `docs/CONTRIBUTING.md`（コードに同期する規約）

## この `docs/` の中身

- `CONTRIBUTING.md` — 開発フロー・ブランチ/タグ運用・テスト規約
- `decisions/` — ADR（採用判断・技術選定。commit に紐づく確定判断のみ）
- `runbook-cloudflare-migration.md` — Vercel → Cloudflare(OpenNext)＋R2 移行の運用手順（判断は `decisions/ADR-001` が正本）
