// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  try {
    const fileData = await req.blob();

    const blob = await put(filename, fileData, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('Image upload API error:', error);
    // エラーの詳細な情報をレスポンスに含める（開発環境のみ推奨）
    return NextResponse.json({ error: 'Image upload failed', details: error.message }, { status: 500 });
  }
}