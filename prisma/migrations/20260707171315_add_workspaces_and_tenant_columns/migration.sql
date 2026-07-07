-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "workspace_id" TEXT NOT NULL DEFAULT 'ws_abs_default';

-- AlterTable
ALTER TABLE "Reserve" ADD COLUMN     "workspace_id" TEXT NOT NULL DEFAULT 'ws_abs_default';

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "workspace_id" TEXT NOT NULL DEFAULT 'ws_abs_default';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_workspace_id" TEXT;

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "memberships_workspace_id_idx" ON "memberships"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_workspace_id_key" ON "memberships"("user_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_code_key" ON "workspace_invites"("code");

-- ---------------------------------------------------------------------------
-- Backfill（手書き）: 既存の単一団体（放送部）を既定ワークスペースとして作成し、
-- 全既存ユーザーを所属させる。List/Reserve/Tag の workspace_id は上の
-- ADD COLUMN ... DEFAULT 'ws_abs_default' で既存行にも自動で入っている。
-- 固定 id 'ws_abs_default' は lib/workspace.ts の DEFAULT_WORKSPACE_ID と一致させること。
-- ---------------------------------------------------------------------------

INSERT INTO "workspaces" ("id", "name", "slug")
VALUES ('ws_abs_default', 'ABS（放送部）', 'abs')
ON CONFLICT ("id") DO NOTHING;

-- 既存ユーザー全員を既定ワークスペースへ。グローバル ADMIN はワークスペース ADMIN として引き継ぐ。
INSERT INTO "memberships" ("id", "user_id", "workspace_id", "role")
SELECT
    'mem_' || gen_random_uuid()::text,
    u."id",
    'ws_abs_default',
    CASE WHEN u."role" = 'ADMIN' THEN 'ADMIN'::"WorkspaceRole" ELSE 'MEMBER'::"WorkspaceRole" END
FROM "users" u
ON CONFLICT ("user_id", "workspace_id") DO NOTHING;

UPDATE "users" SET "last_workspace_id" = 'ws_abs_default' WHERE "last_workspace_id" IS NULL;
