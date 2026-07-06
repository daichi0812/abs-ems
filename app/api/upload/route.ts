// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireManager } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  // 機材画像アップロードは管理操作。lists/tags の変更系と同じ権限判定で守り、
  // 未認証の匿名アップロード（ストレージ悪用）を防ぐ。
  const denied = await requireManager(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  // 配信はカスタムドメイン。DB(List.image) にはここで組み立てた絶対 URL を保存する。
  const baseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error('R2_PUBLIC_BASE_URL is not set');
    return NextResponse.json({ error: 'Image storage is not configured' }, { status: 500 });
  }

  try {
    // R2 の put() は同一キーをエラー無しで上書きするため、UUID でキーを一意化する
    // （旧 @vercel/blob の addRandomSuffix 相当の衝突回避）。
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${crypto.randomUUID()}-${safeName}`;

    const { env } = getCloudflareContext();
    const body = await req.arrayBuffer();
    await env.IMAGES_BUCKET.put(key, body, {
      httpMetadata: {
        contentType: req.headers.get('content-type') ?? undefined,
        // キーは UUID 付きで内容が変わることはないため immutable キャッシュが安全。
        // これが無いと配信がヒューリスティックな短期キャッシュ頼みになり、
        // 機材一覧を開くたびサムネイル20点強がオリジン（R2）まで往復していた。
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const url = `${baseUrl.replace(/\/$/, '')}/${key}`;
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Image upload API error:', error);
    return NextResponse.json({ error: 'Image upload failed', details: error?.message }, { status: 500 });
  }
}
