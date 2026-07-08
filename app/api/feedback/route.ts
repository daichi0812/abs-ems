import { db } from '@/lib/db';
import { requireDeveloper, requireUser } from '@/lib/route-helpers';
import { FeedbackSchema } from '@/schemas';
import { NextResponse } from 'next/server';

// フィードバック送信。ログイン部員なら誰でも。
export async function POST(request: Request) {
    try {
        const auth = await requireUser();
        if (auth instanceof NextResponse) return auth;
        const user = auth;

        const data = await request.json().catch(() => null);
        const parsed = FeedbackSchema.safeParse(data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' },
                { status: 400 }
            );
        }

        const feedback = await db.feedback.create({
            data: {
                userId: user.id,
                body: parsed.data.body,
                path: parsed.data.path ?? null,
            },
        });

        return NextResponse.json({ id: feedback.id }, { status: 201 });
    } catch (error) {
        console.error('Error creating feedback:', error);
        return NextResponse.json({ error: 'Failed to create feedback.' }, { status: 500 });
    }
}

// フィードバック一覧。開発者専用（部長向け ADMIN とは別ゲート）。
export async function GET() {
    try {
        const auth = await requireDeveloper();
        if (auth instanceof NextResponse) return auth;

        const feedbacks = await db.feedback.findMany({
            orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
            include: { user: { select: { name: true, email: true } } },
        });

        return NextResponse.json(feedbacks, { status: 200 });
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        return NextResponse.json({ error: 'Failed to fetch feedbacks.' }, { status: 500 });
    }
}
