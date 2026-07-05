// 【HTTP 解決ゲート】DB(List.image) の全参照を、ホストだけ R2 カスタムドメインに差し替えた URL で
// 実際に HTTP HEAD し、全件 200 になることを確認する。読み取り専用（DB read + HTTP HEAD のみ）。
//
// これは migrate-rewrite.sql による不可逆な UPDATE の「前提ゲート」。
// 敵対的レビュー4観点が独立に同じ結論へ収束：破壊的 UPDATE の前にこの1本を通せば、
//   (a) id 139 の実体 blob が R2 に存在するか（引用符混入で解析漏れ→orphan に紛れている疑い）
//   (b) 非ASCII 6件のデコード往復（NFC/NFD 正規化ズレで一括404の恐れ）
//   (c) 無言の部分コピー失敗
// の3症状を同時に捕捉できる。
//
// 実行タイミング: migrate-blob-to-r2.cjs でコピー完了した「後」・migrate-rewrite.sql の「前」。
//   （コピー前に実行すると当然まだ R2 に無いので全件404になる。順序厳守。）
//
// 使い方: node scripts/migration/verify-r2-reachability.cjs
// 終了コード: 全件200なら 0、1件でも 200 以外なら 1（→ SQL を実行してはならない）。
const fs = require('fs');
const path = require('path');

const P = path.resolve(__dirname, '..', '..');
const OLD_HOST = 'a9imy1jqjrudia3w.public.blob.vercel-storage.com';
const NEW_BASE = 'https://images.abs-ems.forgeonics.com';

const { neonConfig, Pool } = require(P + '/node_modules/@neondatabase/serverless');
const ws = require(P + '/node_modules/ws');
neonConfig.webSocketConstructor = ws;

const env = fs.readFileSync(P + '/.dev.vars', 'utf8');
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// SQL と同じ正規化: 引用符(0x22)を全除去してから、ホスト部を新ベースに差し替える。
function toNewUrl(image) {
  const clean = image.replace(/"/g, '');
  if (!clean.includes(OLD_HOST + '/')) return null; // blob 参照でない行はゲート対象外
  return clean.replace('https://' + OLD_HOST + '/', NEW_BASE + '/');
}

async function head(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);
    try {
      let r = await fetch(url, { method: 'HEAD', signal: ac.signal });
      // 一部 CDN は HEAD を 405 で返すので GET(Range) にフォールバック
      if (r.status === 405 || r.status === 501) {
        r = await fetch(url, { method: 'GET', headers: { range: 'bytes=0-0' }, signal: ac.signal });
      }
      clearTimeout(t);
      return r.status;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (i < tries - 1) await sleep(500 * Math.pow(2, i));
    }
  }
  return `ERR:${lastErr && lastErr.message}`;
}

(async () => {
  const pool = new Pool({ connectionString: dbUrl });
  const rows = (await pool.query(
    `SELECT id, image FROM "List" WHERE image IS NOT NULL AND image <> ''`
  )).rows;
  await pool.end();

  const targets = [];
  for (const row of rows) {
    const newUrl = toNewUrl(row.image);
    if (newUrl) {
      // DB は %エンコード済み URL を保持するため、非ASCII 判定は「デコード後パス」で行う
      // （さもないと日本語ファイル名も全て ASCII に見え非ASCII件数が 0 と誤表示される）。
      let decodedPath = newUrl;
      try { decodedPath = decodeURIComponent(new URL(newUrl).pathname); } catch {}
      targets.push({ id: row.id, newUrl, nonAscii: /[^ -~]/.test(decodedPath) });
    }
  }
  console.log(`対象(blob参照): ${targets.length} 件（非ASCII: ${targets.filter((t) => t.nonAscii).length} 件）`);

  const results = [];
  for (const t of targets) {
    const status = await head(t.newUrl);
    results.push({ ...t, status });
    if (status !== 200) console.error(`NG  id=${t.id}  ${status}  ${t.newUrl}`);
  }

  const bad = results.filter((r) => r.status !== 200);
  console.log(JSON.stringify({
    total: targets.length,
    ok200: results.filter((r) => r.status === 200).length,
    non_ascii_total: targets.filter((t) => t.nonAscii).length,
    non_ascii_ok: results.filter((r) => r.nonAscii && r.status === 200).length,
    bad_count: bad.length,
    bad: bad.slice(0, 20).map((b) => ({ id: b.id, status: b.status, url: b.newUrl })),
  }, null, 2));

  if (bad.length > 0) {
    console.error(`\n⚠️ ${bad.length}件が 200 以外。migrate-rewrite.sql を実行してはならない。`);
    process.exit(1);
  }
  console.log('\n✅ 全件 200。DB 書き換え(migrate-rewrite.sql)へ進んでよい。');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
