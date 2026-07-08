import { db } from '@/lib/db';
import { requireWorkspaceManager } from '@/lib/route-helpers';
import { WorkspaceRole } from '@prisma/client';
import { NextResponse } from 'next/server';

// ロール表示順（OWNER → ADMIN → MEMBER）
const ROLE_ORDER: Record<WorkspaceRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };

// 現在のワークスペースのメンバー一覧（設定ページのメンバー管理 UI 用）。
// ロール情報を含むため管理者（OWNER/ADMIN）のみ。氏名だけの一覧は /api/users を使う。
export async function GET() {
    try {
        const ctx = await requireWorkspaceManager();
        if (ctx instanceof NextResponse) return ctx;

        // Membership は生FKスタイル（リレーション宣言なし）のため2段引き
        const memberships = await db.membership.findMany({
            where: { workspaceId: ctx.workspaceId },
            select: { userId: true, role: true, createdAt: true },
        });
        const users = await db.user.findMany({
            where: { id: { in: memberships.map((m) => m.userId) } },
            select: { id: true, name: true, image: true },
        });
        const userOf = new Map(users.map((u) => [u.id, u]));

        const members = memberships
            .map((m) => ({
                userId: m.userId,
                name: userOf.get(m.userId)?.name ?? null,
                image: userOf.get(m.userId)?.image ?? null,
                role: m.role,
                createdAt: m.createdAt,
            }))
            .sort(
                (a, b) =>
                    ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
                    (a.name ?? "").localeCompare(b.name ?? "", "ja")
            );

        return NextResponse.json(members, { status: 200 });
    } catch (error) {
        console.error('Error fetching members:', error);
        return NextResponse.json({ error: 'メンバーの取得に失敗しました。' }, { status: 500 });
    }
}
