import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

interface Params {
    params: Promise<{ reserveId: string }>;
}

export async function GET(request: Request, { params }: Params) {
    try {
        // ログイン必須（DELETE と同じ currentUser パターン。予約は member-shared なので self-scope はしない）。
        const user = await currentUser();
        if (!user?.id) {
            return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
        }

        const reserveId = parseInt((await params).reserveId, 10);
        if (isNaN(reserveId)) {
            return NextResponse.json({ error: 'Invalid equipment ID.' }, { status: 400 });
        }

        const reserve = await db.reserve.findMany({
            where: { id: reserveId },
        });

        return NextResponse.json(reserve, { status: 200 });
    } catch (error) {
        console.error('Error fetching reserve:', error);
        return NextResponse.json({ error: 'Failed to fetch reserve.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    try {
        const user = await currentUser();
        if (!user?.id) {
            return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
        }

        const reserveId = parseInt((await params).reserveId, 10);
        if (isNaN(reserveId)) {
            return NextResponse.json({ error: 'Invalid equipment ID.' }, { status: 400 });
        }

        // 本人の予約のみ削除可（ADMIN は全予約可）。where に user_id を含めることで
        // check-then-delete のレースなく所有権を強制し、他人の予約は 404 に落ちる
        const isAdmin = user.role === UserRole.ADMIN;
        const result = await db.reserve.deleteMany({
            where: isAdmin ? { id: reserveId } : { id: reserveId, user_id: user.id },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: '予約が見つかりません。' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Reserve deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting reserve:', error);
        return NextResponse.json({ error: 'Failed to delete reserve.' }, { status: 500 });
    }
}