import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const reserves = await db.reserve.findMany();
        return NextResponse.json(reserves, { status: 200 });
    } catch (error) {
        console.error('Error fetching reserves:', error);
        return NextResponse.json({ error: 'Failed to fetch reserves.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { user_id, list_id, start, end, isRenting } = data;

        if (!user_id || !list_id || !start || !end) {
            throw new Error('Missing required fields');
        }

        // 日付を処理
        // 文字列（'YYYY-MM-DD'形式）の場合は、その日付をUTC 00:00:00として保存
        // Date オブジェクト（ISO文字列）の場合は、日本時間の日付部分を抽出して保存
        let startDateTime: Date;
        let endDateTime: Date;

        if (typeof start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
            // 'YYYY-MM-DD' 形式の文字列の場合、そのままUTC 00:00:00として保存
            startDateTime = new Date(start + 'T00:00:00Z');
        } else {
            // ISO文字列やDateオブジェクトの場合、日本時間の日付を抽出
            const startDate = new Date(start);
            // 日本時間での日付を取得（UTC+9）
            const startJST = new Date(startDate.getTime() + 9 * 60 * 60 * 1000);
            startDateTime = new Date(Date.UTC(
                startJST.getUTCFullYear(),
                startJST.getUTCMonth(),
                startJST.getUTCDate(),
                0, 0, 0, 0
            ));
        }

        if (typeof end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
            // 'YYYY-MM-DD' 形式の文字列の場合、そのままUTC 00:00:00として保存
            endDateTime = new Date(end + 'T00:00:00Z');
        } else {
            // ISO文字列やDateオブジェクトの場合、日本時間の日付を抽出
            const endDate = new Date(end);
            // 日本時間での日付を取得（UTC+9）
            const endJST = new Date(endDate.getTime() + 9 * 60 * 60 * 1000);
            endDateTime = new Date(Date.UTC(
                endJST.getUTCFullYear(),
                endJST.getUTCMonth(),
                endJST.getUTCDate(),
                0, 0, 0, 0
            ));
        }

        const reserve = await db.reserve.create({
            data: {
                user_id,
                list_id: Number(list_id),
                start: startDateTime,
                end: endDateTime,
                isRenting: isRenting || 0,
            },
        });

        return NextResponse.json(reserve, { status: 201 });
    } catch (error) {
        console.error('Error creating reserve:', error);
        return NextResponse.json({ error: 'Failed to create reserves' }, { status: 500 });
    }
}