import { db } from '@/lib/db';
import { requireManager, requireUser } from '@/lib/route-helpers';
import { notifyInBackground, notifyNewEquipment } from '@/lib/notify';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const denied = await requireManager(request);
    if (denied) return denied;

    try {
        const data = await request.json();

        const { name, detail, image, tag_id } = data;

        const created = await db.list.create({
            data: {
                name: name,
                detail: detail,
                image: image,
                usable: true,  // 必要に応じて変更
                tag_id: tag_id,
            },
        });

        // 新機材の追加を notifyNewEquipment 有効な部員へ一斉通知（レスポンスは待たせない）。
        notifyInBackground(notifyNewEquipment(created));

        return NextResponse.json({ message: 'データが正常に追加されました。' }, { status: 201 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの追加に失敗しました。' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        // ログイン必須（middleware 一枚依存をやめる defense-in-depth）。
        const auth = await requireUser();
        if (auth instanceof NextResponse) return auth;

        const lists = await db.list.findMany();

        return NextResponse.json(lists, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }
}