import { db } from "@/lib/db";
import { requireManager } from "@/lib/route-helpers";
import { NextResponse } from "next/server";

interface Params {
    params: Promise<{
        tagId: string;
    }>;
}

export async function PUT(request: Request, { params }: Params) {
    const denied = await requireManager(request);
    if (denied) return denied;

    const tag = await request.json();
    try {
        const { tagId } = await params;
        await db.tag.update({ where: { id: parseInt(tagId) }, data: tag });
        return NextResponse.json({ message: "カテゴリを更新しました。" }, { status: 200 });
    } catch (error) {
        console.error("エラー詳細:", error);
        return NextResponse.json({ error: "カテゴリの更新に失敗しました。" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    const denied = await requireManager(request);
    if (denied) return denied;

    try {
        const { tagId } = await params;
        await db.tag.delete({ where: { id: parseInt(tagId) } });
        return NextResponse.json({ message: "カテゴリを削除しました。" }, { status: 200 });
    } catch (error) {
        console.error("エラー詳細:", error);
        return NextResponse.json({ error: "カテゴリの削除に失敗しました。" }, { status: 500 });
    }
}
