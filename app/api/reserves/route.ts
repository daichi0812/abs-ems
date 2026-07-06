import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { notifyInBackground, notifyReservationCreated } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { todayJstAsUtcMidnight } from '@/lib/jst-date';

export async function GET(request: Request) {
    try {
        // ログイン必須。middleware 一枚依存をやめる defense-in-depth（DELETE と同じ currentUser パターン）。
        // 予約データはログイン部員間で共有される設計（共通/機材別カレンダーが全予約を氏名付きで表示）なので、
        // ここで本人の予約だけに絞る self-scope はしない（絞るとカレンダーが壊れる）。認証のみ・フィルタは維持。
        const user = await currentUser();
        if (!user?.id) {
            return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
        }

        // ?user_id= / ?list_id= の完全一致フィルタ（日付演算はしないのでタイムゾーン安全）。
        // クエリ無し = 空 where = 全件 で従来の挙動を維持する（後方互換）。
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const listIdParam = searchParams.get('list_id');

        const where: { user_id?: string; list_id?: number } = {};
        // 存在判定は !== null。?user_id= (空文字) は該当0件として扱い、全件漏洩を防ぐ。
        if (userId !== null) {
            where.user_id = userId;
        }
        if (listIdParam !== null) {
            const listId = Number(listIdParam);
            if (!Number.isInteger(listId)) {
                return NextResponse.json({ error: 'list_id が不正です。' }, { status: 400 });
            }
            where.list_id = listId;
        }

        const reserves = await db.reserve.findMany({ where });
        return NextResponse.json(reserves, { status: 200 });
    } catch (error) {
        console.error('Error fetching reserves:', error);
        return NextResponse.json({ error: 'Failed to fetch reserves.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 予約作成もログイン必須。user_id は body ではなくセッションから導出し、body の
        // user_id は信頼しない（他人になりすました予約作成を防ぐ integrity 対策）。
        const user = await currentUser();
        if (!user?.id) {
            return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
        }

        const data = await request.json();
        const { list_id, start, end, isRenting } = data;

        if (!list_id || !start || !end) {
            return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 });
        }

        // 日付を処理
        // 文字列（'YYYY-MM-DD'形式）の場合は、その日付をUTC 00:00:00として保存
        // Date オブジェクト（ISO文字列）の場合は、日本時間の日付部分を抽出して保存
        let startDateTime: Date;
        let endDateTime: Date;

        if (typeof start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
            // 'YYYY-MM-DD' 形式の文字列の場合、そのままUTC 00:00:00として保存
            startDateTime = new Date(start + 'T00:00:00Z');
        } else {
            // ISO文字列やDateオブジェクトの場合、日本時間の日付を抽出
            const startDate = new Date(start);
            // 日本時間での日付を取得（UTC+9）
            const startJST = new Date(startDate.getTime() + 9 * 60 * 60 * 1000);
            startDateTime = new Date(Date.UTC(
                startJST.getUTCFullYear(),
                startJST.getUTCMonth(),
                startJST.getUTCDate(),
                0, 0, 0, 0
            ));
        }

        if (typeof end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
            // 'YYYY-MM-DD' 形式の文字列の場合、そのままUTC 00:00:00として保存
            endDateTime = new Date(end + 'T00:00:00Z');
        } else {
            // ISO文字列やDateオブジェクトの場合、日本時間の日付を抽出
            const endDate = new Date(end);
            // 日本時間での日付を取得（UTC+9）
            const endJST = new Date(endDate.getTime() + 9 * 60 * 60 * 1000);
            endDateTime = new Date(Date.UTC(
                endJST.getUTCFullYear(),
                endJST.getUTCMonth(),
                endJST.getUTCDate(),
                0, 0, 0, 0
            ));
        }

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return NextResponse.json({ error: '日付の形式が不正です。' }, { status: 400 });
        }

        if (endDateTime < startDateTime) {
            return NextResponse.json({ error: '終了日は開始日以降にしてください。' }, { status: 400 });
        }

        // 保存値は「JST日付のUTC 00:00」なので、今日(JST)も同じ座標系に変換して比較する
        const todayJst = todayJstAsUtcMidnight();
        if (startDateTime < todayJst) {
            return NextResponse.json({ error: '予約開始日は今日以降にしてください。' }, { status: 400 });
        }

        // 同じ機材で期間が重なる予約（inclusive）を拒否する。
        // read committed では同時 INSERT のレースを完全には防げないベストエフォートのチェック。
        const result = await db.$transaction(async (tx) => {
            const conflict = await tx.reserve.findFirst({
                where: {
                    list_id: Number(list_id),
                    start: { lte: endDateTime },
                    end: { gte: startDateTime },
                },
            });
            if (conflict) {
                return { conflict: true as const };
            }
            const reserve = await tx.reserve.create({
                data: {
                    user_id: user.id,
                    list_id: Number(list_id),
                    start: startDateTime,
                    end: endDateTime,
                    isRenting: isRenting || 0,
                },
            });
            return { conflict: false as const, reserve };
        });

        if (result.conflict) {
            return NextResponse.json({ error: 'この期間にはすでに予約が入っています。' }, { status: 409 });
        }

        // 予約確定を本人へメール通知（notifyReservationEvents 尊重）。レスポンスは待たせない。
        notifyInBackground(notifyReservationCreated(result.reserve));

        return NextResponse.json(result.reserve, { status: 201 });
    } catch (error) {
        console.error('Error creating reserve:', error);
        return NextResponse.json({ error: 'Failed to create reserves' }, { status: 500 });
    }
}