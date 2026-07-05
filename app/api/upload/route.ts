// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { hasManagerAccess } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  // 機材画像アップロードは管理操作。lists/tags の変更系と同じ hasManagerAccess で守り、
  // 未認証の匿名アップロード（blob ストレージ悪用）を防ぐ。
  if (!(await hasManagerAccess(req))) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  try {
    const fileData = await req.blob();

    // @vercel/blob 1.0 以降は addRandomSuffix がデフォルト false になり、
    // 同名ファイルの上書きはエラーになるため、従来どおりサフィックスを付与する
    const blob = await put(filename, fileData, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('Image upload API error:', error);
    // エラーの詳細な情報をレスポンスに含める（開発環境のみ推奨）
    return NextResponse.json({ error: 'Image upload failed', details: error.message }, { status: 500 });
  }
}