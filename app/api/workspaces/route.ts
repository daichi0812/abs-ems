import { db } from '@/lib/db';
import { requireUser } from '@/lib/route-helpers';
import { WorkspaceSchema } from '@/schemas';
import { NextResponse } from 'next/server';

// 自分の所属ワークスペース一覧。ヘッダーのスイッチャー・設定ページが使う。
// 所属ゼロのユーザー（招待待ち・作成前）も呼ぶため requireWorkspaceMember ではなく requireUser。
export async function GET() {
    try {
        const auth = await requireUser();
        if (auth instanceof NextResponse) return auth;

        const memberships = await db.membership.findMany({
            where: { userId: auth.id },
            orderBy: { createdAt: 'asc' },
            select: { workspaceId: true, role: true },
        });
        const workspaces = await db.workspace.findMany({
            where: { id: { in: memberships.map((m) => m.workspaceId) } },
            select: { id: true, name: true },
        });
        const nameOf = new Map(workspaces.map((w) => [w.id, w.name]));

        // 所属順（作成順）を保った [{ id, name, role }] を返す（useCachedEndpoint 用の配列）。
        const result = memberships.map((m) => ({
            id: m.workspaceId,
            name: nameOf.get(m.workspaceId) ?? m.workspaceId,
            role: m.role,
        }));
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        return NextResponse.json({ error: 'ワークスペースの取得に失敗しました。' }, { status: 500 });
    }
}

// ワークスペースのセルフサーブ作成。作成者が OWNER になり、現在のワークスペースも切り替わる。
export async function POST(request: Request) {
    try {
        const auth = await requireUser();
        if (auth instanceof NextResponse) return auth;

        const parsed = WorkspaceSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' },
                { status: 400 }
            );
        }

        // slug は現状 URL に出さない内部識別子。ユーザー名は日本語が多く slugify できないため
        // ランダムに採番する（表示は name を使う）。
        const slug = `w-${crypto.randomUUID().slice(0, 8)}`;

        const workspace = await db.$transaction(async (tx) => {
            const ws = await tx.workspace.create({
                data: { name: parsed.data.name, slug },
            });
            await tx.membership.create({
                data: { userId: auth.id!, workspaceId: ws.id, role: 'OWNER' },
            });
            await tx.user.update({
                where: { id: auth.id },
                data: { lastWorkspaceId: ws.id },
            });
            return ws;
        });

        return NextResponse.json({ id: workspace.id, name: workspace.name }, { status: 201 });
    } catch (error) {
        console.error('Error creating workspace:', error);
        return NextResponse.json({ error: 'ワークスペースの作成に失敗しました。' }, { status: 500 });
    }
}
