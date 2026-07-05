import { db } from '@/lib/db';
import { hasManagerAccess } from '@/lib/api-auth';
import { currentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

interface Params {
    params: Promise<{
        equipmentId: string;
    }>;
}

// 特定のIDのデータを取得する
export async function GET(request: Request, { params }: Params) {
    try {
        // ログイン必須（middleware 一枚依存をやめる defense-in-depth）。
        const user = await currentUser();
        if (!user?.id) {
            return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
        }

        const equipmentId = parseInt((await params).equipmentId, 10);

        if (isNaN(equipmentId)) {
            return NextResponse.json({ error: '無効なIDです。' }, { status: 400 });
        }

        const equipmentData = await db.list.findUnique({
            where: { id: equipmentId },
        });

        if (!equipmentData) {
            return NextResponse.json({ error: 'データが見つかりませんでした。' }, { status: 404 });
        }

        return NextResponse.json(equipmentData, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: Params) {
    if (!(await hasManagerAccess(request))) {
        return NextResponse.json({ error: '権限がありません。' }, { status: 403 });
    }

    const data = await request.json();
    const { name, detail, image, tag_id } = data;

    try {
        const equipmentId = parseInt((await params).equipmentId, 10);

        if (isNaN(equipmentId)) {
            return NextResponse.json({ error: '無効なIDです。' }, { status: 400 });
        }

        const equipmentData = await db.list.findUnique({
            where: { id: equipmentId },
        });

        if (!equipmentData) {
            return NextResponse.json({ error: 'データが見つかりませんでした。' }, { status: 404 });
        }

        // 機材データを更新
        const updatedEquipment = await db.list.update({
            where: { id: equipmentId },
            data: {
                name,
                detail,
                image,
                tag_id,
            },
        });

        return NextResponse.json(updatedEquipment, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: Params) {
    if (!(await hasManagerAccess(request))) {
        return NextResponse.json({ error: '権限がありません。' }, { status: 403 });
    }

    try {
        const equipmentId = parseInt((await params).equipmentId, 10);

        if (isNaN(equipmentId)) {
            return NextResponse.json({ error: '無効なIDです。' }, { status: 400 });
        }

        const equipmentData = await db.list.findUnique({
            where: { id: equipmentId },
        });

        if (!equipmentData) {
            return NextResponse.json({ error: 'データが見つかりませんでした。' }, { status: 404 });
        }

        // 機材データを削除
        const deleteEquipment = await db.list.delete({
            where: { id: equipmentId }
        });

        return NextResponse.json(deleteEquipment, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }
}