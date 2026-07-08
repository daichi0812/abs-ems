-- 監査カラムの整備。既存行の created_at は本 migration の適用時刻になる
-- （それ以前の真の作成日時は記録されていない。以後の新規行から正確な値が入る）。
-- updated_at の自動更新は Prisma の @updatedAt（クライアント側）が担う。

-- AlterTable
ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "List" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                   ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Reserve" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "workspace_invites" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- OWNER 昇格 backfill（手書き）: OWNER 優位のロール管理ルール導入にあたり、
-- OWNER 不在のワークスペース（backfill 由来の既定ワークスペース）では
-- 既存の ADMIN を OWNER へ昇格する（P4 以前に全権を持っていた運用者に相当）。
-- セルフサーブ作成のワークスペースは作成者が既に OWNER のため影響しない。
-- ---------------------------------------------------------------------------

UPDATE "memberships" m SET "role" = 'OWNER'
WHERE m."role" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "memberships" o
    WHERE o."workspace_id" = m."workspace_id" AND o."role" = 'OWNER'
  );
