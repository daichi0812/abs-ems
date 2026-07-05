# decisions（ADR）

採用判断・技術選定など、**commit に紐づく確定した技術判断** を ADR（Architecture Decision Record＝
技術判断の記録）として残す場所。背景・比較案・判断理由・影響を、後から追える形で書く。

> 流動的な検討・迷いは Notion（プロジェクトページ）が正本。
> ここには **確定した判断だけ** を置く。

## 命名

- `ADR-NNN_タイトル.md`（連番 + 短いタイトル）。例：`ADR-001_migrate-to-serwist.md`

## 雛形

```markdown
# ADR-NNN: <タイトル>

- Status: Proposed | Accepted | Superseded
- Date: YYYY-MM-DD

## 背景
## 検討した案
## 決定
## 理由
## 影響
## 参考（Notion / commit / tag）
```

## ADR 一覧

- [ADR-001_migrate-to-cloudflare-opennext-r2.md](ADR-001_migrate-to-cloudflare-opennext-r2.md) — Vercel の Next.js モノリスを Cloudflare(OpenNext)＋R2 へ移行、FastAPI 分割は不採用（手順は [`../runbook-cloudflare-migration.md`](../runbook-cloudflare-migration.md)）
