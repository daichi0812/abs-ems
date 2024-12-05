import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const tags = await db.tag.findMany();

        return NextResponse.json(tags, { status: 201 });
    } catch (error) {
        return NextResponse.json(error, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tag = await request.json();

        await db.tag.create({ data: tag });
        return NextResponse.json({ status: 201 });
    } catch (error) {
        return NextResponse.json({ status: 500 });
    }
}