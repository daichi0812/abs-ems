import { db } from '@/lib/db';
import {
    isWorkspaceManagerRole,
    requireWorkspaceMember,
    type WorkspaceContext,
} from '@/lib/route-helpers';
import { notifyInBackground, notifyReservationCancelled } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { todayJstAsUtcMidnight } from '@/lib/jst-date';

interface Params {
    params: Promise<{ reserveId: string }>;
}

// 他人の予約も操作できる管理者か（ワークスペースの OWNER/ADMIN のみ。
// グローバル UserRole.ADMIN は開発者/運用向けに縮退し、予約操作の権限には使わない）。
const isReserveManager = (ctx: WorkspaceContext): boolean =>
    isWorkspaceManagerRole(ctx.workspaceRole);

export async function GET(request: Request, { params }: Params) {
    try {
        // 所属メンバー必須（DELETE と同じ認証パターン。予約はワークスペース内共有なので self-scope はしない）。
        const ctx = await requireWorkspaceMember();
        if (ctx instanceof NextResponse) return ctx;

        const reserveId = parseInt((await params).reserveId, 10);
        if (isNaN(reserveId)) {
            return NextResponse.json({ error: 'Invalid equipment ID.' }, { status: 400 });
        }

        const reserve = await db.reserve.findMany({
            where: { id: reserveId, workspaceId: ctx.workspaceId },
        });

        return NextResponse.json(reserve, { status: 200 });
    } catch (error) {
        console.error('Error fetching reserve:', error);
        return NextResponse.json({ error: 'Failed to fetch reserve.' }, { status: 500 });
    }
}

// isRenting の状態遷移（0:予約中 / 1:受取可 / 2:貸出中 / 3:滞納 / 4:返却済）。
// 許可する遷移は「借りる」(0|1→2) と「返却」(2|3→4) の2つだけ。
export async function PATCH(request: Request, { params }: Params) {
    try {
        const ctx = await requireWorkspaceMember();
        if (ctx instanceof NextResponse) return ctx;
        const user = ctx.user;

        const reserveId = parseInt((await params).reserveId, 10);
        if (isNaN(reserveId)) {
            return NextResponse.json({ error: 'Invalid reserve ID.' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const isRenting = body?.isRenting;
        if (isRenting !== 2 && isRenting !== 4) {
            return NextResponse.json({ error: '許可されていない状態遷移です。' }, { status: 400 });
        }

        // DELETE と同じ所有権ポリシー: 本人の予約のみ（管理者は全予約可）。
        // where に user_id とワークスペースを含め、他人・他団体の予約は 404 に落とす。
        const ownerScope = isReserveManager(ctx)
            ? { workspaceId: ctx.workspaceId }
            : { workspaceId: ctx.workspaceId, user_id: user.id };

        if (isRenting === 2) {
            // 借りる: 貸出期間内（JST 今日が start〜end、保存値は「JST日付のUTC 00:00」）のみ。
            const todayJst = todayJstAsUtcMidnight();
            const result = await db.reserve.updateMany({
                where: {
                    id: reserveId,
                    ...ownerScope,
                    isRenting: { in: [0, 1] },
                    start: { lte: todayJst },
                    end: { gte: todayJst },
                },
                data: { isRenting: 2 },
            });
            if (result.count === 0) {
                // 見つからない/期間外/すでに貸出中のいずれか。存在確認して分かりやすく返す。
                const reserve = await db.reserve.findFirst({ where: { id: reserveId, ...ownerScope } });
                if (!reserve) {
                    return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 });
                }
                return NextResponse.json({ error: '貸出期間外か、すでに貸出中です。' }, { status: 409 });
            }
        } else {
            // 返却: 貸出中(2)・滞納(3)のみ。end（予約していた返却期限）は書き換えず、
            // 実際に返した日を returnedAt に記録する。期限前の早期返却でも残り期間の
            // 空きは重複チェック側の isRenting=4 除外で解放される。
            const result = await db.reserve.updateMany({
                where: { id: reserveId, ...ownerScope, isRenting: { in: [2, 3] } },
                data: { isRenting: 4, returnedAt: todayJstAsUtcMidnight() },
            });
            if (result.count === 0) {
                const reserve = await db.reserve.findFirst({ where: { id: reserveId, ...ownerScope } });
                if (!reserve) {
                    return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 });
                }
                return NextResponse.json({ error: '貸出中の予約ではありません。' }, { status: 409 });
            }
        }

        return NextResponse.json({ message: 'Reserve updated successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error updating reserve:', error);
        return NextResponse.json({ error: 'Failed to update reserve.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    try {
        const ctx = await requireWorkspaceMember();
        if (ctx instanceof NextResponse) return ctx;
        const user = ctx.user;

        const reserveId = parseInt((await params).reserveId, 10);
        if (isNaN(reserveId)) {
            return NextResponse.json({ error: 'Invalid equipment ID.' }, { status: 400 });
        }

        // 本人の予約のみ削除可（管理者は全予約可）。where に user_id とワークスペースを
        // 含めることで check-then-delete のレースなく所有権を強制し、他人・他団体の予約は 404 に落ちる。
        // 一般部員は未貸出（0:予約中/1:受取可）のみキャンセル可。貸出中(2)・滞納(3)・
        // 返却済(4)の記録は消せない（旧UIのクライアント側ルールをサーバーに移植）。
        const isManager = isReserveManager(ctx);
        // 管理者が他人の予約を取り消したとき持ち主へ通知するため、削除前に対象を控える。
        const target = await db.reserve.findFirst({
            where: { id: reserveId, workspaceId: ctx.workspaceId },
        });
        const result = await db.reserve.deleteMany({
            where: isManager
                ? { id: reserveId, workspaceId: ctx.workspaceId }
                : { id: reserveId, workspaceId: ctx.workspaceId, user_id: user.id, isRenting: { in: [0, 1] } },
        });

        if (result.count === 0) {
            const reserve = isManager
                ? null
                : await db.reserve.findFirst({
                      where: { id: reserveId, workspaceId: ctx.workspaceId, user_id: user.id },
                  });
            if (reserve) {
                return NextResponse.json(
                    { error: '貸出中・返却済みの予約は削除できません。' },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 });
        }

        // 管理者が他人の予約を取り消した場合のみ、持ち主へメール通知（本人の自己取消は通知しない）。
        if (target?.user_id && target.user_id !== user.id) {
            notifyInBackground(notifyReservationCancelled(target));
        }

        return NextResponse.json({ message: 'Reserve deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting reserve:', error);
        return NextResponse.json({ error: 'Failed to delete reserve.' }, { status: 500 });
    }
}