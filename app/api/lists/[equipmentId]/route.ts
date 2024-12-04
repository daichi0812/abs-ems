import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

interface Params {
    params: {
        equipmentId: string;
    };
}

// 特定のIDのデータを取得する
export async function GET(request: Request, { params }: Params) {
    try {
        const productId = parseInt(params.equipmentId, 10);

        if (isNaN(productId)) {
            return NextResponse.json({ error: '無効なIDです。' }, { status: 400 });
        }

        const equipmentData = await db.list.findUnique({
            where: { id: productId },
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
    const data = await request.json();
    const { name, detail, image, tag_id } = data;

    try {
        const equipmentId = parseInt(params.equipmentId, 10);

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
    try {
        const equipmentId = parseInt(params.equipmentId, 10);

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
        const updatedEquipment = await db.list.delete({
            where: { id: equipmentId }
        });

        return NextResponse.json(updatedEquipment, { status: 200 });
    } catch (error) {
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの取得に失敗しました。' }, { status: 500 });
    }
}