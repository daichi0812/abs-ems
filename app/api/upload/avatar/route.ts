// app/api/upload/avatar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// プロフィールアイコンのアップロード。機材画像の /api/upload と違い管理操作では
// ないため hasManagerAccess ではなく「本人ログイン」で守る。更新できるのは常に
// セッション本人の User.image だけなので、なりすまし・他人の上書きは成立しない。
//
// クライアントは lib/image-compress で 512px へ縮小してから送る前提だが、
// 圧縮は fail-open（未対応環境では原本のまま）なので、サーバ側でも上限を敷く。
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: '画像ファイルを指定してください。' }, { status: 400 });
  }

  // 配信はカスタムドメイン。DB(User.image) にはここで組み立てた絶対 URL を保存する。
  const baseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error('R2_PUBLIC_BASE_URL is not set');
    return NextResponse.json({ error: 'Image storage is not configured' }, { status: 500 });
  }

  try {
    const body = await req.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: '画像が空です。' }, { status: 400 });
    }
    if (body.byteLength > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: '画像が大きすぎます（5MBまで）。' }, { status: 413 });
    }

    // R2 の put() は同一キーをエラー無しで上書きするため UUID でキーを一意化する。
    // キーが毎回変わることで immutable キャッシュでも差し替えが即時反映される。
    const base = baseUrl.replace(/\/$/, '');
    const key = `avatars/${user.id}/${crypto.randomUUID()}`;

    const { env } = getCloudflareContext();
    await env.IMAGES_BUCKET.put(key, body, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    const url = `${base}/${key}`;

    // 差し替え前の URL を控えてから更新し、自分の旧アバターだけ R2 から掃除する
    // （プレフィックス確認により機材画像など他のオブジェクトは対象外）。
    // 掃除に失敗しても表示には影響しないため、エラーはログのみで握りつぶす。
    const prev = await db.user.findUnique({
      where: { id: user.id },
      select: { image: true },
    });
    await db.user.update({ where: { id: user.id }, data: { image: url } });

    const ownPrefix = `${base}/avatars/${user.id}/`;
    if (prev?.image?.startsWith(ownPrefix)) {
      const oldKey = prev.image.slice(base.length + 1);
      try {
        await env.IMAGES_BUCKET.delete(oldKey);
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
      }
    }

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Avatar upload API error:', error);
    return NextResponse.json({ error: 'Image upload failed', details: error?.message }, { status: 500 });
  }
}
