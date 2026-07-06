import { db } from '@/lib/db';
import { requireManager, requireUser } from '@/lib/route-helpers';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // ログイン必須（middleware 一枚依存をやめる defense-in-depth）。
        const auth = await requireUser();
        if (auth instanceof NextResponse) return auth;

        // 並び順は sortOrder 昇順（同値は id 昇順で安定化）。
        const tags = await db.tag.findMany({
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });

        return NextResponse.json(tags, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'カテゴリの取得に失敗しました。' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const denied = await requireManager(request);
    if (denied) return denied;

    try {
        const tag = await request.json();

        // 新規カテゴリは末尾に追加（既存 sortOrder の最大値 + 1）。
        const last = await db.tag.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
        const sortOrder = (last?.sortOrder ?? 0) + 1;

        await db.tag.create({ data: { ...tag, sortOrder } });
        return NextResponse.json({ message: 'カテゴリを作成しました。' }, { status: 201 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'カテゴリの作成に失敗しました。' }, { status: 500 });
    }
}
