// Vercel Blob の全オブジェクト(70件)を R2(abs-ems-images) へコピーする。
//   キー = b.url のパス部を decodeURIComponent したもの
//         （＝ホスト差し替え後の DB URL[https://images.abs-ems.forgeonics.com/<path>] が解決するキー）。
//   content-type は取得元レスポンスから引き継ぐ。R2 投入は wrangler(--remote) 経由＝追加クレデンシャル不要。
//
// 使い方:
//   node scripts/migration/migrate-blob-to-r2.cjs --smoke   # 代表1件だけ put→get 往復スモークテスト（本番投入なし相当の最小確認）
//   node scripts/migration/migrate-blob-to-r2.cjs --dry-run # 列挙＋fetch のみ（wrangler put はしない）
//   node scripts/migration/migrate-blob-to-r2.cjs           # 本実行（全70件を R2 へ put）
//
// 前提: BLOB_READ_WRITE_TOKEN は .dev.vars から読む。wrangler は認証済み（wrangler login 済み）であること。
// 終了コード: 1件でも失敗したら exit 1（`&&` 連結や CI ゲートを機能させるため）。
//
// ⚠️ このスクリプトは「コピー」だけを行う。DB(List.image) の URL 書き換えは migrate-rewrite.sql が別途行う。
//    正しい順序: (1) このスクリプトでコピー → (2) verify-r2-reachability.cjs で全件 HTTP 200 を確認
//              → (3) migrate-rewrite.sql で DB を書き換え。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const P = path.resolve(__dirname, '..', '..'); // リポジトリ root（wrangler.jsonc を読ませるため execFileSync の cwd に使う）
const BUCKET = 'abs-ems-images';
const DRY = process.argv.includes('--dry-run');
const SMOKE = process.argv.includes('--smoke');

const env = fs.readFileSync(P + '/.dev.vars', 'utf8');
const token = env.match(/^BLOB_READ_WRITE_TOKEN=(.+)$/m)[1].trim().replace(/^["']|["']$/g, '');

// R2 は受信パスを1回 URL デコードしてキー照合する。よって put するキーもデコード済みにする（両側で厳密に1回）。
const keyOf = (u) => decodeURIComponent(new URL(u).pathname.replace(/^\//, ''));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 指数バックオフ付きリトライ（fetch の一時的 5xx / ネットワーク瞬断 / wrangler の一時失敗を吸収）。
async function withRetry(fn, { tries = 3, base = 500, label = '' } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(base * Math.pow(2, i));
    }
  }
  throw new Error(`${label} failed after ${tries} tries: ${lastErr && lastErr.message}`);
}

// タイムアウト付き fetch（undici はデフォルトで無制限に待つため AbortController で打ち切る）。
async function fetchWithTimeout(url, opts = {}, ms = 30000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function listAll() {
  const out = [];
  let cursor;
  do {
    const u = new URL('https://blob.vercel-storage.com');
    u.searchParams.set('limit', '1000');
    if (cursor) u.searchParams.set('cursor', cursor);
    const r = await withRetry(
      () => fetchWithTimeout(u, { headers: { authorization: `Bearer ${token}` } }),
      { label: 'list' }
    );
    if (!r.ok) throw new Error('list ' + r.status);
    const d = await r.json();
    for (const b of (d.blobs || [])) out.push(b);
    cursor = d.hasMore ? d.cursor : undefined;
  } while (cursor);
  return out;
}

// blob 1件を R2 へ put。失敗時は stderr を err に含めて投げる（最終失敗の真因を追えるように）。
function putToR2(key, tmp, ct) {
  return withRetry(
    () =>
      new Promise((resolve, reject) => {
        try {
          execFileSync(
            'npx',
            ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', tmp, '--content-type', ct, '--remote'],
            { stdio: ['ignore', 'ignore', 'pipe'], cwd: P } // cwd=P で wrangler.jsonc(バケット/アカウント文脈)を読ませる
          );
          resolve();
        } catch (e) {
          const stderr = (e.stderr && e.stderr.toString().trim()) || '';
          reject(new Error(stderr || e.message));
        }
      }),
    { label: `put ${key}` }
  );
}

async function copyOne(b, tmpDir) {
  const key = keyOf(b.url); // 例外時も下の try/catch で拾えるよう copyOne 内に置く
  const res = await withRetry(() => fetchWithTimeout(b.url), { label: `fetch ${key}` });
  if (!res.ok) throw new Error('fetch ' + res.status);
  const ct = res.headers.get('content-type') || 'application/octet-stream';
  const buf = Buffer.from(await res.arrayBuffer());
  if (DRY) return { key, bytes: buf.length, ct, dry: true };
  const tmp = path.join(tmpDir, 'obj.bin');
  fs.writeFileSync(tmp, buf); // 逐次同期実行なので tmp 使い回しは競合しない
  await putToR2(key, tmp, ct);
  return { key, bytes: buf.length, ct };
}

// 代表1件を put→get で往復させ、書き込み側(認証/アカウント/--remote対象/キー往復)を LIVE 前に一度だけ実証する。
// 非ASCII を優先的に選ぶ（デコード往復が唯一静かにミスマッチし得る箇所のため）。
async function smokeTest(blobs, tmpDir) {
  const nonAscii = blobs.find((b) => /[^\x00-\x7F]/.test(keyOf(b.url)));
  const target = nonAscii || blobs[0];
  const key = keyOf(target.url);
  console.log(`smoke: target key = ${key} (${nonAscii ? 'non-ASCII' : 'ASCII'})`);
  const res = await withRetry(() => fetchWithTimeout(target.url), { label: 'smoke fetch' });
  const ct = res.headers.get('content-type') || 'application/octet-stream';
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = path.join(tmpDir, 'smoke.bin');
  fs.writeFileSync(tmp, buf);
  await putToR2(key, tmp, ct);
  // read-back: 同じキーで R2 から取り出せるか（=格納キーのバイト列が put したキーと一致するか）
  const back = path.join(tmpDir, 'smoke.back');
  execFileSync('npx', ['wrangler', 'r2', 'object', 'get', `${BUCKET}/${key}`, '--file', back, '--remote'],
    { stdio: ['ignore', 'ignore', 'pipe'], cwd: P });
  const ok = fs.existsSync(back) && fs.statSync(back).size === buf.length;
  console.log(`smoke: read-back ${ok ? 'OK' : 'MISMATCH'} (put ${buf.length}B, got ${ok ? buf.length : (fs.existsSync(back) ? fs.statSync(back).size : 'none')}B)`);
  if (!ok) throw new Error('smoke read-back mismatch — キー往復が壊れている');
}

(async () => {
  const blobs = await listAll();
  console.log(`blobs: ${blobs.length}  mode: ${SMOKE ? 'SMOKE' : DRY ? 'DRY-RUN' : 'LIVE'}`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blob2r2-'));

  try {
    if (SMOKE) {
      await smokeTest(blobs, tmpDir);
      console.log('smoke: PASS — 書き込み側(認証/アカウント/キー往復)は健全。');
      return;
    }

    let ok = 0, fail = 0;
    const failed = [];
    for (const b of blobs) {
      try {
        const r = await copyOne(b, tmpDir);
        ok++;
        if (DRY) console.log(`DRY  ${r.key}  (${r.bytes}B, ${r.ct})`);
        else if (ok % 10 === 0) console.log(`  ...${ok}/${blobs.length}`);
      } catch (e) {
        fail++;
        const key = (() => { try { return keyOf(b.url); } catch { return b.url; } })();
        failed.push({ key, err: e.message });
        console.error(`FAIL ${key}: ${e.message}`);
      }
    }
    console.log(JSON.stringify({ total: blobs.length, ok, fail, failed }, null, 2));
    if (fail > 0) {
      console.error(`\n⚠️ ${fail}件 失敗。DB書き換え(migrate-rewrite.sql)は実行しないこと。`);
      process.exitCode = 1; // 部分失敗を終了コードで表明（&& 連結・CI ゲートが機能する）
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
