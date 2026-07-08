import { db } from "@/lib/db";
import { requireWorkspaceManager } from "@/lib/route-helpers";
import { NextResponse } from "next/server";

// カテゴリの並び順を一括更新する。ボディは { orderedIds: number[] }（表示順に並んだ tag id 配列）。
// 配列内の位置を sortOrder（0 始まり）として transaction で採番し直す。ワークスペース管理者必須。
export async function PATCH(request: Request) {
    const ctx = await requireWorkspaceManager();
    if (ctx instanceof NextResponse) return ctx;

    try {
        const body = (await request.json()) as { orderedIds?: unknown };
        const orderedIds = body.orderedIds;

        if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "number")) {
            return NextResponse.json({ error: "orderedIds は数値配列である必要があります。" }, { status: 400 });
        }

        // updateMany + workspaceId 条件で、他ワークスペースのカテゴリ id が混ざっていても無視される。
        await db.$transaction(
            (orderedIds as number[]).map((id, index) =>
                db.tag.updateMany({
                    where: { id, workspaceId: ctx.workspaceId },
                    data: { sortOrder: index },
                }),
            ),
        );

        return NextResponse.json({ message: "並び順を更新しました。" }, { status: 200 });
    } catch (error) {
        console.error("エラー詳細:", error);
        return NextResponse.json({ error: "並び順の更新に失敗しました。" }, { status: 500 });
    }
}
