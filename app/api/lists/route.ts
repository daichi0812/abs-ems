import { db } from '@/lib/db';
import { currentRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const role = await currentRole();
    if (role !== UserRole.ADMIN) {
        return NextResponse.json({ error: '権限がありません。' }, { status: 403 });
    }

    try {
        const data = await request.json();

        const { name, detail, image, tag_id } = data;

        await db.list.create({
            data: {
                name: name,
                detail: detail,
                image: image,
                usable: true,  // 必要に応じて変更
                tag_id: tag_id,
            },
        });

        return new Response(JSON.stringify({ message: 'データが正常に追加されました。' }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('エラー詳細:', error);
        return new Response(JSON.stringify({ error: 'データの追加に失敗しました。' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function GET(request: Request) {
    try {
        const lists = await db.list.findMany();

        return NextResponse.json(lists, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }
}