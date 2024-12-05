import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        const { user_id, list_id, isRenting } = data;

        await db.reserve.create({
            data: {
                user_id: user_id,
                list_id: list_id,
                isRenting: isRenting,
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
        const reserves = await db.reserve.findMany();

        return NextResponse.json(reserves, { status: 201 });
    } catch (error) {
        return NextResponse.json({ status: 500 });
    }
}