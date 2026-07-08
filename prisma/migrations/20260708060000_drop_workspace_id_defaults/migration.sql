-- 権限一本化(P4)にともない、移行期の DB デフォルト 'ws_abs_default' を撤去する。
-- 全 create 経路（API routes / seed）は workspace_id を明示的に渡すようになったため、
-- 書き忘れは silent な既定ワークスペースへの越境ではなく NOT NULL エラーとして顕在化する。

-- AlterTable
ALTER TABLE "List" ALTER COLUMN "workspace_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Reserve" ALTER COLUMN "workspace_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "workspace_id" DROP DEFAULT;
