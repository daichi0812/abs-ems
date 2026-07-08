import { db } from "@/lib/db";
import { requireWorkspaceManager } from "@/lib/route-helpers";
import { TagSchema } from "@/schemas";
import { NextResponse } from "next/server";

interface Params {
    params: Promise<{
        tagId: string;
    }>;
}

export async function PUT(request: Request, { params }: Params) {
    const ctx = await requireWorkspaceManager();
    if (ctx instanceof NextResponse) return ctx;

    try {
        const parsed = TagSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "入力内容が不正です。" },
                { status: 400 }
            );
        }
        const { tagId } = await params;
        // updateMany + count 判定で、他ワークスペースのカテゴリ id を 404 に落とす
        // （update の unique where にはワークスペース条件を足せないため）。
        const result = await db.tag.updateMany({
            where: { id: parseInt(tagId, 10), workspaceId: ctx.workspaceId },
            data: { name: parsed.data.name, color: parsed.data.color },
        });
        if (result.count === 0) {
            return NextResponse.json({ error: "カテゴリが見つかりません。" }, { status: 404 });
        }
        return NextResponse.json({ message: "カテゴリを更新しました。" }, { status: 200 });
    } catch (error) {
        console.error("エラー詳細:", error);
        return NextResponse.json({ error: "カテゴリの更新に失敗しました。" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    const ctx = await requireWorkspaceManager();
    if (ctx instanceof NextResponse) return ctx;

    try {
        const { tagId } = await params;
        const result = await db.tag.deleteMany({
            where: { id: parseInt(tagId, 10), workspaceId: ctx.workspaceId },
        });
        if (result.count === 0) {
            return NextResponse.json({ error: "カテゴリが見つかりません。" }, { status: 404 });
        }
        return NextResponse.json({ message: "カテゴリを削除しました。" }, { status: 200 });
    } catch (error) {
        console.error("エラー詳細:", error);
        return NextResponse.json({ error: "カテゴリの削除に失敗しました。" }, { status: 500 });
    }
}
