import { db } from '@/lib/db';
import { requireDeveloper } from '@/lib/route-helpers';
import { NextResponse } from 'next/server';

interface Params {
    params: Promise<{ feedbackId: string }>;
}

// 対応済みフラグの切り替え。開発者専用。
export async function PATCH(request: Request, { params }: Params) {
    try {
        const auth = await requireDeveloper();
        if (auth instanceof NextResponse) return auth;

        const feedbackId = parseInt((await params).feedbackId, 10);
        if (isNaN(feedbackId)) {
            return NextResponse.json({ error: 'Invalid feedback ID.' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        if (typeof body?.resolved !== 'boolean') {
            return NextResponse.json({ error: 'resolved は boolean で指定してください。' }, { status: 400 });
        }

        const result = await db.feedback.updateMany({
            where: { id: feedbackId },
            data: { resolved: body.resolved },
        });
        if (result.count === 0) {
            return NextResponse.json({ error: 'フィードバックが見つかりません。' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Feedback updated.' }, { status: 200 });
    } catch (error) {
        console.error('Error updating feedback:', error);
        return NextResponse.json({ error: 'Failed to update feedback.' }, { status: 500 });
    }
}
