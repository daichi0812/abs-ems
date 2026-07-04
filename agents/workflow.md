# git ワークフロー

git ブランチ/タグ戦略の **正本は Notion**（本人が維持・更新）。
このファイルでは要約を持たず（drift するため）、**正本へのポインタ＋このリポジトリ固有の差分だけ** を書く。

## 正本

**Git ブランチ戦略ベストプラクティス**（Notion / Tech KB）。
URL は [`sources-of-truth.md`](sources-of-truth.md) の表を参照（Notion URL の正本はそこ1箇所）。

このリポジトリでの具体的な運用手順（マージ基準・コマンド例・テスト規約）は
[`../docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md) にまとまっている。日常の作業はそちらを見る。

## このリポジトリ固有の差分

- default branch: `main`（2026-07-05 に `develop` から変更）。日常開発の統合先は `develop`。
- **PR を使うのは `main` に入れるときだけ**（`develop` → `main` のリリースと `hotfix/` → `main`）。
  `main` は branch protection + ruleset で直 push 不可（PR 必須・approval 0）。PR のマージは Daichi 本人が行う。
- **`feat/` / `fix/` → `develop` は PR 不要**。ローカルで `merge --no-ff` して push する。
- プロダクト開発リポジトリのため、`experiment/` ブランチと `paper/` / `archive/` tag は
  「枠として用意するが普段は使わない」。主な運用は `feat/` / `fix/` / `hotfix/` ブランチと
  `release/` / `milestone/` tag。
