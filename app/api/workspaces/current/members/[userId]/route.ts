import { db } from '@/lib/db';
import { requireWorkspaceManager } from '@/lib/route-helpers';
import { canAssignRole, canManageMember } from '@/lib/workspace';
import { MemberRoleSchema } from '@/schemas';
import { WorkspaceRole } from '@prisma/client';
import { NextResponse } from 'next/server';

interface Params {
    params: Promise<{ userId: string }>;
}

/**
 * 最後の OWNER の降格・除名を防ぐガード。ワークスペースが管理不能（OWNER ゼロ）に
 * なる操作は 409 で拒否する。対象が OWNER のときだけ数えれば十分。
 */
async function isLastOwner(workspaceId: string, targetRole: WorkspaceRole): Promise<boolean> {
    if (targetRole !== WorkspaceRole.OWNER) return false;
    const owners = await db.membership.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
    });
    return owners <= 1;
}

// メンバーのロール変更。権限ルールは lib/workspace.ts（OWNER 優位）を参照。
export async function PATCH(request: Request, { params }: Params) {
    try {
        const ctx = await requireWorkspaceManager();
        if (ctx instanceof NextResponse) return ctx;

        const { userId } = await params;
        const parsed = MemberRoleSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' },
                { status: 400 }
            );
        }
        const newRole = parsed.data.role;

        // 対象はワークスペース込みで引く（他ワークスペースのユーザー id は 404）
        const target = await db.membership.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: ctx.workspaceId } },
        });
        if (!target) {
            return NextResponse.json({ error: 'メンバーが見つかりません。' }, { status: 404 });
        }

        if (!canManageMember(ctx.workspaceRole, target.role) || !canAssignRole(ctx.workspaceRole, newRole)) {
            return NextResponse.json(
                { error: 'このロール変更を行う権限がありません。' },
                { status: 403 }
            );
        }

        if (target.role === newRole) {
            return NextResponse.json({ message: '変更はありません。' }, { status: 200 });
        }

        // OWNER → 他ロールへ落とす場合、最後の OWNER なら拒否（ワークスペースのロックアウト防止）
        if (await isLastOwner(ctx.workspaceId, target.role)) {
            return NextResponse.json(
                { error: '最後のオーナーは降格できません。先に別のオーナーを任命してください。' },
                { status: 409 }
            );
        }

        await db.membership.update({
            where: { id: target.id },
            data: { role: newRole },
        });

        return NextResponse.json({ message: 'ロールを変更しました。' }, { status: 200 });
    } catch (error) {
        console.error('Error updating member role:', error);
        return NextResponse.json({ error: 'ロールの変更に失敗しました。' }, { status: 500 });
    }
}

// メンバーの除名。予約履歴（Reserve）は記録として残す。
// 除名後の本人アクセスは requireWorkspaceMember の毎リクエスト DB 検証で即座に 403 になる。
export async function DELETE(request: Request, { params }: Params) {
    try {
        const ctx = await requireWorkspaceManager();
        if (ctx instanceof NextResponse) return ctx;

        const { userId } = await params;
        const target = await db.membership.findUnique({
            where: { userId_workspaceId: { userId, workspaceId: ctx.workspaceId } },
        });
        if (!target) {
            return NextResponse.json({ error: 'メンバーが見つかりません。' }, { status: 404 });
        }

        if (!canManageMember(ctx.workspaceRole, target.role)) {
            return NextResponse.json(
                { error: 'このメンバーを除名する権限がありません。' },
                { status: 403 }
            );
        }

        if (await isLastOwner(ctx.workspaceId, target.role)) {
            return NextResponse.json(
                { error: '最後のオーナーは除名できません。先に別のオーナーを任命してください。' },
                { status: 409 }
            );
        }

        await db.$transaction(async (tx) => {
            await tx.membership.delete({ where: { id: target.id } });
            // 除名した人の「現在のワークスペース」がここを指したままだと、次回の
            // JWT リフレッシュまで 403 が続く。null に戻して残りの所属へフォールバックさせる
            // （所属ゼロなら /workspaces/new へ誘導される既存動線）。
            await tx.user.updateMany({
                where: { id: userId, lastWorkspaceId: ctx.workspaceId },
                data: { lastWorkspaceId: null },
            });
        });

        return NextResponse.json({ message: 'メンバーを除名しました。' }, { status: 200 });
    } catch (error) {
        console.error('Error removing member:', error);
        return NextResponse.json({ error: 'メンバーの除名に失敗しました。' }, { status: 500 });
    }
}
