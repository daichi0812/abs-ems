import { db } from '@/lib/db';
import { requireWorkspaceManager } from '@/lib/route-helpers';
import { NextResponse } from 'next/server';

// 招待リンクの有効期間（7日）。使い回しの利便と、漏れたリンクが永久に生きない安全の折衷。
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 現在のワークスペースへの招待コードを発行する（OWNER/ADMIN のみ）。
// 回数制限は設けない（部の新歓などで同じリンクを複数人に配る運用のため）。
export async function POST(request: Request) {
    try {
        const ctx = await requireWorkspaceManager(request);
        if (ctx instanceof NextResponse) return ctx;

        const code = crypto.randomUUID().replace(/-/g, '');
        const invite = await db.workspaceInvite.create({
            data: {
                workspaceId: ctx.workspaceId,
                code,
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
                createdBy: ctx.user.id,
            },
        });

        const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://abs-ems.forgeonics.com';
        return NextResponse.json(
            {
                code: invite.code,
                url: `${base}/invite/${invite.code}`,
                expiresAt: invite.expiresAt,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating invite:', error);
        return NextResponse.json({ error: '招待リンクの発行に失敗しました。' }, { status: 500 });
    }
}
