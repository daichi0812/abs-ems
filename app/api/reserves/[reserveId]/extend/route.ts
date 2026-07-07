import { db } from '@/lib/db';
import { requireUser } from '@/lib/route-helpers';
import { notifyInBackground, notifyReservationExtended } from '@/lib/notify';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseDateOnly, todayJstAsUtcMidnight } from '@/lib/jst-date';

interface Params {
    params: Promise<{ reserveId: string }>;
}

// 予約の延長。end（返却期限）を後ろへ動かす専用ルート。
// 親の PATCH は「isRenting 遷移(借りる/返却)のみ」という契約なので、期間の変更はここに分離する。
// 短縮は対応しない（早期返却・キャンセルで代替できるため。newEnd > 現end のみ許可）。
export async function PATCH(request: Request, { params }: Params) {
    try {
        const auth = await requireUser();
        if (auth instanceof NextResponse) return auth;
        const user = auth;

        const reserveId = parseInt((await params).reserveId, 10);
        if (isNaN(reserveId)) {
            return NextResponse.json({ error: 'Invalid reserve ID.' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const endParam = body?.end;
        if (typeof endParam !== 'string') {
            return NextResponse.json({ error: '延長後の返却日を指定してください。' }, { status: 400 });
        }
        const newEnd = parseDateOnly(endParam);
        if (!newEnd) {
            return NextResponse.json({ error: '日付の形式が不正です。' }, { status: 400 });
        }

        // 親ルートの PATCH/DELETE と同じ所有権ポリシー: 本人の予約のみ（ADMIN は全予約可）。
        const isAdmin = user.role === UserRole.ADMIN;
        const ownerScope = isAdmin ? {} : { user_id: user.id };

        const reserve = await db.reserve.findFirst({ where: { id: reserveId, ...ownerScope } });
        if (!reserve) {
            return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 });
        }
        if (reserve.isRenting === 4) {
            return NextResponse.json({ error: '返却済みの予約は延長できません。' }, { status: 409 });
        }
        if (!reserve.end || newEnd <= reserve.end) {
            return NextResponse.json(
                { error: '延長後の返却日は現在の返却日より後にしてください。' },
                { status: 400 }
            );
        }
        if (newEnd < todayJstAsUtcMidnight()) {
            return NextResponse.json({ error: '延長後の返却日は今日以降にしてください。' }, { status: 400 });
        }

        // 延長で新たに占有する期間が他の予約と重ならないか確認してから更新する。
        // POST /api/reserves と同じ構造のベストエフォートチェック（read committed のレースは許容）。
        // 自分自身は除外し、返却済(4)は空き扱い。
        const result = await db.$transaction(async (tx) => {
            const conflict = await tx.reserve.findFirst({
                where: {
                    list_id: reserve.list_id,
                    id: { not: reserveId },
                    isRenting: { not: 4 },
                    start: { lte: newEnd },
                    end: { gte: reserve.start ?? undefined },
                },
            });
            if (conflict) {
                return { conflict: true as const };
            }
            // remindedOn を消して、新しい返却期限日にリマインダーを再送させる。
            const updated = await tx.reserve.updateMany({
                where: { id: reserveId, ...ownerScope, isRenting: { in: [0, 1, 2, 3] } },
                data: { end: newEnd, remindedOn: null },
            });
            return { conflict: false as const, count: updated.count };
        });

        if (result.conflict) {
            return NextResponse.json({ error: 'この期間にはすでに予約が入っています。' }, { status: 409 });
        }
        if (result.count === 0) {
            // 事前取得後に返却/削除された稀なケース。
            return NextResponse.json({ error: '予約を延長できませんでした。' }, { status: 409 });
        }

        // 管理者が他人の予約を延長した場合のみ、持ち主へ通知（本人操作は通知しない。DELETE と同じポリシー）。
        if (reserve.user_id && reserve.user_id !== user.id) {
            notifyInBackground(notifyReservationExtended({ ...reserve, end: newEnd }));
        }

        return NextResponse.json({ message: 'Reserve extended successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error extending reserve:', error);
        return NextResponse.json({ error: 'Failed to extend reserve.' }, { status: 500 });
    }
}
