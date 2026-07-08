-- 管理者不在ワークスペースの救済。
--
-- P1 の backfill は「users.role=ADMIN のユーザーを WS ADMIN に」する設計だったが、
-- 本番では backfill 実行時点で role=ADMIN のユーザーが存在せず、全員 MEMBER になった。
-- P4 でグローバル ADMIN フォールバックを廃止したため、そのままでは誰も
-- 機材管理・招待発行ができない。直前の migration（既存 WS ADMIN → OWNER 昇格）も
-- 「WS ADMIN がいる」前提のため効かない。
--
-- ここでは OWNER も ADMIN もいないワークスペースに限り、グローバル role=ADMIN の
-- ユーザー（運用者）の membership を OWNER へ昇格する。管理者が既にいる
-- ワークスペースには影響しない（dev・セルフサーブ作成の WS では no-op）。

UPDATE "memberships" m SET "role" = 'OWNER'
FROM "users" u
WHERE m."user_id" = u."id"
  AND u."role" = 'ADMIN'
  AND m."role" = 'MEMBER'
  AND NOT EXISTS (
    SELECT 1 FROM "memberships" x
    WHERE x."workspace_id" = m."workspace_id"
      AND x."role" IN ('OWNER', 'ADMIN')
  );
