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

        // UTC日付として解釈
        const startDate = new Date(start); // `start`が文字列の場合、ここで正しいフォーマットか確認
        const startDateTime = new Date(Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate(), // UTCの日付を取得
            0, 0, 0, 0 // 時間をUTCの00:00:00に設定
        ));

        const endDate = new Date(end);
        const endDateTime = new Date(Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            0, 0, 0, 0
        ));

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