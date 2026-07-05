-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- 既存タグの初期並び順を id 昇順で採番（新規カラムのデフォルト 0 が全行同値になるのを解消）
UPDATE "Tag" AS t
SET "sort_order" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM "Tag"
) AS sub
WHERE t.id = sub.id;
