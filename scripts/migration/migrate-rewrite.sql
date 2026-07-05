-- ============================================================
-- List.image を Vercel Blob → R2 カスタムドメインへ書き換え
-- 実行環境: Neon SQL Editor（本番 logicode-auth / main ブランチ）
-- ============================================================
-- ⚠️ 実行前提（すべて満たすまで step4 を実行しないこと）:
--   (1) migrate-blob-to-r2.cjs で全70件を R2 にコピー済み（exit 0＝全件成功）。
--   (2) verify-r2-reachability.cjs が「全件 200」で PASS 済み
--       ＝ id139 の実体・非ASCII6件のデコード往復・部分コピー失敗の3点をこのゲートで担保済み。
-- ⚠️ 一括 Run 禁止。step 1→2→3 を個別に Run して結果を目視してから step4 を単独 Run すること
--     （Neon SQL Editor は一括実行だと最後の結果セットしか表示せず、事前確認が無効化される）。
-- ⚠️ バックアップ(step1)は一度きり。already exists で止まっても手動 DROP → 再取得しないこと
--     （移行後の値を捕捉して切り戻し不能になる）。step4 はバックアップ存在を機械的に要求する。
-- ============================================================

-- ------------------------------------------------------------
-- 1) スナップショット（切り戻し用。日付はタグ。IF NOT EXISTS を付けない＝再実行は error で止まる＝保護的）
-- ------------------------------------------------------------
CREATE TABLE _list_image_backup_20260705 AS
SELECT id, image FROM "List";

-- ------------------------------------------------------------
-- 2) 事前確認（各行を個別に Run して値を目視する）
-- ------------------------------------------------------------
-- 2a) 置換対象の総数（引用符混入の id 139 も host 部分文字列で拾う）。期待値: 41
SELECT count(*) AS to_update
FROM "List"
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com/%';

-- 2b) スキームが https 以外の行が無いか（引用符を剥がした上で判定）。期待値: 0
--     0 でない場合、下の REPLACE('https://...') はホストを差し替えられず「触ったのに未移行」になる。
SELECT count(*) AS non_https
FROM "List"
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com/%'
  AND REPLACE(image, '"', '') NOT LIKE 'https://%';

-- 2c) 引用符が混入している blob 行の把握（id 139 のはず）と、引用符が本当に ASCII 0x22 か。
--     first/last が 34 で、内側に 0x22 が無いこと（先頭/末尾のみ）を目視する。
SELECT id,
       image,
       ascii(substr(image, 1, 1))                 AS first_char_ascii,   -- 期待 34 (")
       ascii(substr(image, length(image), 1))     AS last_char_ascii,    -- 期待 34 (")
       (length(image) - length(replace(image, '"', ''))) AS quote_count  -- 期待 2（先頭+末尾のみ）
FROM "List"
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com%'
  AND image LIKE '%"%';

-- ------------------------------------------------------------
-- 3) 置換後の姿を UPDATE 前にプレビュー（40件の通常行 + id139 の両方）
-- ------------------------------------------------------------
SELECT id,
  REPLACE(
    REPLACE(image, '"', ''),
    'https://a9imy1jqjrudia3w.public.blob.vercel-storage.com/',
    'https://images.abs-ems.forgeonics.com/'
  ) AS new_image
FROM "List"
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com/%'
ORDER BY id;

-- ------------------------------------------------------------
-- 4) 本実行：id139(引用符混入)を分離し、通常40件とは別枠で当てる。
--    どちらも「バックアップ表が存在し blob URL を保持している」ことを機械的に要求する
--    （EXISTS が false＝既に移行済み→0件更新／backup が無ければ error で中断＝保護的）。
-- ------------------------------------------------------------
-- 4a) 通常40件：ホスト差し替えのみ（引用符混入行は除外）
UPDATE "List"
SET image = REPLACE(
      image,
      'https://a9imy1jqjrudia3w.public.blob.vercel-storage.com/',
      'https://images.abs-ems.forgeonics.com/'
    )
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com/%'
  AND image NOT LIKE '%"%'
  AND EXISTS (SELECT 1 FROM _list_image_backup_20260705 b WHERE b.image LIKE '%vercel-storage.com%');
--   ↑ 期待: UPDATE 40

-- 4b) id139 のみ：引用符除去 → ホスト差し替え（verify-r2-reachability.cjs で 200 を確認済みが前提）
UPDATE "List"
SET image = REPLACE(
      REPLACE(image, '"', ''),
      'https://a9imy1jqjrudia3w.public.blob.vercel-storage.com/',
      'https://images.abs-ems.forgeonics.com/'
    )
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com%'
  AND image LIKE '%"%'
  AND EXISTS (SELECT 1 FROM _list_image_backup_20260705 b WHERE b.image LIKE '%vercel-storage.com%');
--   ↑ 期待: UPDATE 1

-- ------------------------------------------------------------
-- 5) 検証（ホストは当該ストアで固定してカウント）
-- ------------------------------------------------------------
SELECT count(*) AS new_host   FROM "List" WHERE image LIKE 'https://images.abs-ems.forgeonics.com/%';       -- 期待 41 以上（2-1 の新規アップロードがあれば超過）
SELECT count(*) AS old_host   FROM "List" WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com%'; -- 期待 0
SELECT count(*) AS with_quote FROM "List" WHERE image LIKE 'https://images.abs-ems.forgeonics.com/%' AND image LIKE '%"%'; -- 期待 0
SELECT id, image FROM "List" WHERE id = 139;                                                                 -- 引用符が消えた R2 URL か目視

-- 6) 他カラムの残存参照チェック（Vercel Blob 廃止前に List.image 以外に blob 参照が無いことを確認）
SELECT count(*) AS users_image_blob_refs
FROM users
WHERE image LIKE '%a9imy1jqjrudia3w.public.blob.vercel-storage.com%'; -- 期待 0

-- ============================================================
-- 切り戻し（必要時のみ。全行を id join で復元＝冪等）
-- ============================================================
-- UPDATE "List" l SET image = b.image
-- FROM _list_image_backup_20260705 b
-- WHERE l.id = b.id;

-- 片付け（本番稼働が安定してから）
-- DROP TABLE _list_image_backup_20260705;
