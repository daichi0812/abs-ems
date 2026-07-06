import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { parseDateOnly } from '@/lib/jst-date';
import { NextResponse } from 'next/server';

// 共有カレンダー専用の集約 GET。
//
// 旧実装はクライアントが /api/users・/api/lists・/api/tags・/api/reserves を
// 4本並行で叩いていた。Workers では HTTP リクエストごとに PrismaClient ＝ Neon 接続
// （TLS + WebSocket + 認証で 250〜500ms。lib/db.ts 参照）が張られるため、
// カレンダー初回表示は「接続ハンドシェイク×4」を毎回払っていた。
// ここに集約すると接続は1本で済み、さらに
//   - reserves は from/to（表示中の窓）で絞る … 履歴が増えても転送量・描画コストが一定
//   - 各テーブルは select で最小列に絞る … lists の image/detail（長いURL・長文）を落とす
// の2点でペイロードも小さくなる。
//
// 予約データはログイン部員間で共有される設計（全予約を氏名付きで表示）なので、
// /api/reserves の GET と同じく認証のみで self-scope はしない。
export async function GET(request: Request) {
    try {
        const user = await currentUser();
        if (!user?.id) {
            return NextResponse.json({ error: '認証されていません。' }, { status: 401 });
        }

        // from/to は必須（YYYY-MM-DD、JST暦日）。無制限の全件取得を許すと
        // 旧 /api/reserves と同じ「履歴とともに際限なく重くなる」経路が残ってしまう。
        const { searchParams } = new URL(request.url);
        const from = parseDateOnly(searchParams.get('from') ?? '');
        const to = parseDateOnly(searchParams.get('to') ?? '');
        if (!from || !to || to < from) {
            return NextResponse.json({ error: 'from / to（YYYY-MM-DD）が不正です。' }, { status: 400 });
        }

        // 同一リクエスト内なので4クエリとも lib/db.ts が集約した1接続に乗る
        const [users, lists, tags, reserves] = await Promise.all([
            db.user.findMany({ select: { id: true, name: true } }),
            db.list.findMany({ select: { id: true, name: true, tag_id: true } }),
            db.tag.findMany({ select: { id: true, name: true, color: true }, orderBy: { sortOrder: 'asc' } }),
            db.reserve.findMany({
                // 窓と重なる予約（inclusive）。保存値は「JST日付の UTC 00:00」。
                where: { start: { lte: to }, end: { gte: from } },
                select: { id: true, user_id: true, start: true, end: true, list_id: true, isRenting: true },
            }),
        ]);

        return NextResponse.json({ users, lists, tags, reserves }, { status: 200 });
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        return NextResponse.json({ error: 'Failed to fetch calendar data.' }, { status: 500 });
    }
}
