import { db } from '@/lib/db';
import { hasManagerAccess } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const tags = await db.tag.findMany();

        return NextResponse.json(tags, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'カテゴリの取得に失敗しました。' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await hasManagerAccess(request))) {
        return NextResponse.json({ error: '権限がありません。' }, { status: 403 });
    }

    try {
        const tag = await request.json();

        await db.tag.create({ data: tag });
        return NextResponse.json({ message: 'カテゴリを作成しました。' }, { status: 201 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'カテゴリの作成に失敗しました。' }, { status: 500 });
    }
}
