import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

interface Params {
    params: { reservesId: string };
}

export async function POST(request: Request, { params }: Params) {
    try {
        const data = await request.json();
        const { user_id, list_id, start, end, isRenting } = data;

        const reserve = await db.reserve.create({
            data: { user_id, list_id, start, end, isRenting },
        });

        return NextResponse.json(reserve, { status: 201 });
    } catch (error) {
        console.error('Error creating reserve:', error);
        return NextResponse.json({ error: 'Failed to create reserve.' }, { status: 500 });
    }
}