// 移行の突き合わせ: Blob(b.url パス部) と DB(List.image パス部) を照合。読み取り専用。
// 出力は件数と少数の例のみ。接続文字列/トークンは出力しない。
// 併せて List.image 以外（users.image）に blob ホスト参照が残っていないかも確認する
//   （Vercel Blob 廃止時に別経路で画像が消えるのを防ぐため）。
const fs = require('fs');
const path = require('path');
const P = path.resolve(__dirname, '..', '..');
const { neonConfig, Pool } = require(P + '/node_modules/@neondatabase/serverless');
const ws = require(P + '/node_modules/ws');
neonConfig.webSocketConstructor = ws;
const env = fs.readFileSync(P + '/.dev.vars', 'utf8');
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g, '');
const token = env.match(/^BLOB_READ_WRITE_TOKEN=(.+)$/m)[1].trim().replace(/^["']|["']$/g, '');
const BLOB_HOST = 'a9imy1jqjrudia3w.public.blob.vercel-storage.com';
const seg = (u) => { try { return decodeURIComponent(new URL(u).pathname.replace(/^\//, '')); } catch { return null; } };
(async () => {
  // Blob: 全 url パス部
  const blobSegs = new Set();
  let cursor;
  do {
    const u = new URL('https://blob.vercel-storage.com');
    u.searchParams.set('limit', '1000');
    if (cursor) u.searchParams.set('cursor', cursor);
    const r = await fetch(u, { headers: { authorization: `Bearer ${token}` } });
    const d = await r.json();
    for (const b of (d.blobs || [])) blobSegs.add(seg(b.url));
    cursor = d.hasMore ? d.cursor : undefined;
  } while (cursor);

  // DB: List.image の一覧
  const pool = new Pool({ connectionString: dbUrl });
  const rows = (await pool.query(`SELECT id, image FROM "List" WHERE image IS NOT NULL AND image <> ''`)).rows;
  // 他カラムの blob 参照残存（users.image）
  let usersBlobRefs = -1;
  try {
    usersBlobRefs = (await pool.query(
      `SELECT count(*)::int AS n FROM users WHERE image LIKE '%${BLOB_HOST}%'`
    )).rows[0].n;
  } catch (e) { usersBlobRefs = `ERR:${e.message}`; }
  await pool.end();

  const dbSegs = new Set();
  const notBlobHost = [];   // 40 vs 41 の犯人候補（別ホスト/形式）
  const broken = [];        // DB 参照だが blob に無い
  for (const row of rows) {
    const img = row.image;
    let host = null; try { host = new URL(img).host; } catch {}
    if (host !== BLOB_HOST) { notBlobHost.push({ id: row.id, host, head: img.slice(0, 60) }); continue; }
    const s = seg(img);
    dbSegs.add(s);
    if (!blobSegs.has(s)) broken.push({ id: row.id, seg: s });
  }
  const orphans = [...blobSegs].filter(s => !dbSegs.has(s));
  console.log(JSON.stringify({
    blob_total: blobSegs.size,
    db_rows_with_image: rows.length,
    db_on_blob_host: dbSegs.size,
    db_other_host_count: notBlobHost.length,
    db_other_host_examples: notBlobHost.slice(0, 3),
    broken_refs_count: broken.length,
    broken_examples: broken.slice(0, 5),
    orphan_blobs_count: orphans.length,
    users_image_blob_refs: usersBlobRefs, // 期待: 0（List.image 以外に blob 参照が無いこと）
  }, null, 2));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
