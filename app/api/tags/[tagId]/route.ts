import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
    params: Promise<{
        tagId: string;
    }>;
}

export async function PUT(request: Request, { params }: Params) {
    const tag = await request.json();
    try {
        const { tagId } = await params;
        await db.tag.update({ where: { id: parseInt(tagId) }, data: tag });
        return NextResponse.json({ status: 201 });
    } catch (error) {
        return NextResponse.json({ status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    try {
        const { tagId } = await params;
        await db.tag.delete({ where: { id: parseInt(tagId) } });
        return NextResponse.json({ status: 201 });
    } catch (error) {
        return NextResponse.json({ status: 500 });
    }
}