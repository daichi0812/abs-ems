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

        // 事前の findUnique による存在確認はせず、対象なしは P2025 で 404 に落とす
        // （リクエストごとに新規接続を張る構成では DB 1往復の削減が効く）。
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
        if ((error as { code?: string })?.code === 'P2025') {
            return NextResponse.json({ error: 'データが見つかりませんでした。' }, { status: 404 });
        }
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの更新に失敗しました。' }, { status: 500 });
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

        // 貸出中・滞納（機材が部員の手元にある）の機材は削除させない。
        // 削除すると「機材は手元にあるのに記録が消えた」状態になり在庫管理が壊れる。
        const activeCount = await db.reserve.count({
            where: { list_id: equipmentId, isRenting: { in: [2, 3] } },
        });
        if (activeCount > 0) {
            return NextResponse.json(
                { error: '貸出中の機材は削除できません。返却された後に削除してください。' },
                { status: 409 }
            );
        }

        // 機材だけ消すと予約が孤児化し、部員のマイページに「#42」のような
        // 機材名なしの予約が残り続けるため、関連予約もまとめて削除する
        //（Reserve.list_id は FK なしの Int? なので DB 側の cascade は効かない）。
        // 対象なしは P2025 で 404 に落とす。
        const [, deleteEquipment] = await db.$transaction([
            db.reserve.deleteMany({ where: { list_id: equipmentId } }),
            db.list.delete({ where: { id: equipmentId } }),
        ]);

        return NextResponse.json(deleteEquipment, { status: 200 });
    } catch (error) {
        if ((error as { code?: string })?.code === 'P2025') {
            return NextResponse.json({ error: 'データが見つかりませんでした。' }, { status: 404 });
        }
        console.error('エラー詳細:', error);
        return NextResponse.json({ error: 'データの削除に失敗しました。' }, { status: 500 });
    }
}