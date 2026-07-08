import { db } from '@/lib/db';
import { requireWorkspaceManager, requireWorkspaceMember } from '@/lib/route-helpers';
import { TagSchema } from '@/schemas';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // 所属メンバー必須（middleware 一枚依存をやめる defense-in-depth）。
        // 現在のワークスペースのカテゴリだけを返す。
        const ctx = await requireWorkspaceMember();
        if (ctx instanceof NextResponse) return ctx;

        // 並び順は sortOrder 昇順（同値は id 昇順で安定化）。
        const tags = await db.tag.findMany({
            where: { workspaceId: ctx.workspaceId },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });

        return NextResponse.json(tags, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'カテゴリの取得に失敗しました。' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const ctx = await requireWorkspaceManager();
    if (ctx instanceof NextResponse) return ctx;

    try {
        const parsed = TagSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' },
                { status: 400 }
            );
        }

        // 新規カテゴリは末尾に追加（同一ワークスペース内の sortOrder 最大値 + 1）。
        const last = await db.tag.findFirst({
            where: { workspaceId: ctx.workspaceId },
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true },
        });
        const sortOrder = (last?.sortOrder ?? 0) + 1;

        await db.tag.create({
            data: {
                name: parsed.data.name,
                color: parsed.data.color,
                sortOrder,
                workspaceId: ctx.workspaceId,
            },
        });
        return NextResponse.json({ message: 'カテゴリを作成しました。' }, { status: 201 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'カテゴリの作成に失敗しました。' }, { status: 500 });
    }
}
