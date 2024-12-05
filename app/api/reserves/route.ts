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

        const reserve = await db.reserve.create({
            data: { user_id, list_id, start, end, isRenting },
        });

        return NextResponse.json(reserve, { status: 201 });
    } catch (error) {
        console.error('Error creating reserve:', error);
        return NextResponse.json({ error: 'Failed to create reserve.' }, { status: 500 });
    }
}