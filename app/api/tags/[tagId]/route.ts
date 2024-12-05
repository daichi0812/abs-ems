import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
    params: {
        tagId: string;
    };
}

export async function PUT(request: Request, { params }: Params) {
    const tag = await request.json();
    try {
        await db.tag.update({ where: { id: parseInt(params.tagId) }, data: tag });
        return NextResponse.json({ status: 201 });
    } catch (error) {
        return NextResponse.json({ status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    try {
        await db.tag.delete({ where: { id: parseInt(params.tagId) } });
        return NextResponse.json({ status: 201 });
    } catch (error) {
        return NextResponse.json({ status: 500 });
    }
}