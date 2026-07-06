import { db } from "@/lib/db";
import { requireManager } from "@/lib/route-helpers";
import { TagSchema } from "@/schemas";
import { NextResponse } from "next/server";

interface Params {
    params: Promise<{
        tagId: string;
    }>;
}

export async function PUT(request: Request, { params }: Params) {
    const denied = await requireManager(request);
    if (denied) return denied;

    try {
        const parsed = TagSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。" },
                { status: 400 }
            );
        }
        const { tagId } = await params;
        await db.tag.update({
            where: { id: parseInt(tagId, 10) },
            data: { name: parsed.data.name, color: parsed.data.color },
        });
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
        await db.tag.delete({ where: { id: parseInt(tagId, 10) } });
        return NextResponse.json({ message: "カテゴリを削除しました。" }, { status: 200 });
    } catch (error) {
        console.error("エラー詳細:", error);
        return NextResponse.json({ error: "カテゴリの削除に失敗しました。" }, { status: 500 });
    }
}
