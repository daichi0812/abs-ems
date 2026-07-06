import { db } from '@/lib/db';
import { notifyReturnReminder } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { todayJstAsUtcMidnight } from '@/lib/jst-date';

/* 返却期限リマインダー（cron から叩かれる内部エンドポイント）。
 *
 * 呼び出し元は worker.ts の scheduled ハンドラ（Cloudflare Cron Trigger）。
 * 外部から叩かれないよう CRON_SECRET（wrangler secret）で保護する。
 *
 * 返却期限（Reserve.end）が本日（JST）で、まだ貸出中(2)・滞納(3)＝未返却の予約を対象に、
 * 持ち主へ「本日返却期限」を通知する。同日の二重送信は reminded_on で弾く。
 */

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get('authorization');
    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: '権限がありません。' }, { status: 401 });
    }

    try {
        // 保存値は「JST 日付の UTC 00:00」。今日(JST)も同じ座標系に変換して等値比較する。
        const todayJst = todayJstAsUtcMidnight();

        const reserves = await db.reserve.findMany({
            where: {
                end: todayJst,
                isRenting: { in: [2, 3] },
                user_id: { not: null },
                // 本日分をまだ送っていないものだけ（cron 二重発火・再試行に対する冪等性）。
                OR: [{ remindedOn: null }, { remindedOn: { not: todayJst } }],
            },
        });

        // 1件の失敗が全体を止めないよう allSettled。成功したものだけ reminded_on を更新する。
        const results = await Promise.allSettled(
            reserves.map(async (r) => {
                await notifyReturnReminder(r);
                await db.reserve.update({
                    where: { id: r.id },
                    data: { remindedOn: todayJst },
                });
            }),
        );

        const sent = results.filter((x) => x.status === 'fulfilled').length;
        const failed = results.length - sent;
        if (failed > 0) {
            console.error(`return-reminders: ${failed}/${results.length} 件の送信に失敗しました。`);
        }
        return NextResponse.json({ targeted: reserves.length, sent, failed }, { status: 200 });
    } catch (error) {
        console.error('Error sending return reminders:', error);
        return NextResponse.json({ error: 'Failed to send reminders.' }, { status: 500 });
    }
}
