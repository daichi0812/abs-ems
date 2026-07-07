import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";

/* アプリ通知の配信層。
 *
 * 現状はメールのみ（Cloudflare Email Sending バインディング。lib/mail.ts と同じ経路）。
 * LINE は将来 UserSettings.lineNotifyEnabled && lineUserId で push を足す想定で、
 * ここに「継ぎ目」だけ用意しておく（今は未実装。ユーザー判断で保留）。
 *
 * 通知の種類は UserSettings のトグルに対応する:
 *   - returnReminder    → notifyReturnReminder    返却期限リマインダー（cron）
 *   - reservationEvents → notifyReservationEvents 予約の確定・（管理者による）取消
 *   - newEquipment      → notifyNewEquipment      新しい機材の追加
 * UserSettings 行が無いユーザーは schema のデフォルト（reminder/events=true, newEquipment=false）に従う。
 *
 * getCloudflareContext() は「関数内で」呼ぶ（Workers ランタイムでのみ有効。lib/mail.ts 参照）。
 */

const FROM = { email: "noreply@abs-ems.forgeonics.com", name: "ABS EMS" };

/**
 * 通知をリクエストのバックグラウンドで実行する（レスポンスを待たせない）。
 * Workers では ctx.waitUntil に載せてレスポンス後も走らせる。
 * Cloudflare コンテキストが無い環境（next dev / テスト）や送信失敗でも
 * 呼び出し元（予約作成など）を巻き込まないよう、必ず握りつぶす（通知はベストエフォート）。
 */
export function notifyInBackground(task: Promise<void>): void {
  const guarded = task.catch((e) => {
    console.error("notify failed:", e);
  });
  try {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(guarded);
  } catch {
    // ctx 不在（Workers ランタイム外）。fire-and-forget にフォールバック。
  }
}

export type NotifyKind = "returnReminder" | "reservationEvents" | "newEquipment";

const KIND_TO_SETTING = {
  returnReminder: "notifyReturnReminder",
  reservationEvents: "notifyReservationEvents",
  newEquipment: "notifyNewEquipment",
} as const;

// UserSettings 行が無いときの既定値（schema の @default と一致させる）。
const KIND_DEFAULT: Record<NotifyKind, boolean> = {
  returnReminder: true,
  reservationEvents: true,
  newEquipment: false,
};

interface MailContent {
  subject: string;
  html: string;
  text: string;
}

// 低レベル送信。宛先アドレスへメールを1通送る（設定チェックはしない）。
async function sendMail(to: string, msg: MailContent): Promise<void> {
  const { env } = getCloudflareContext();
  await env.EMAIL.send({ from: FROM, to, ...msg });
}

/**
 * 単一ユーザーへ通知する。UserSettings のトグルを尊重し、無効なら何もしない。
 * メールアドレス未登録のユーザーもスキップ。例外は握りつぶさず呼び出し側に伝える
 * （cron/waitUntil 側で allSettled / catch する）。
 */
export async function notifyUser(
  userId: string,
  kind: NotifyKind,
  msg: MailContent,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      settings: {
        select: {
          notifyReturnReminder: true,
          notifyReservationEvents: true,
          notifyNewEquipment: true,
        },
      },
    },
  });
  if (!user?.email) return;

  const enabled = user.settings
    ? user.settings[KIND_TO_SETTING[kind]]
    : KIND_DEFAULT[kind];
  if (!enabled) return;

  // TODO(LINE): ここで settings?.lineNotifyEnabled && lineUserId のとき LINE push を足す。
  await sendMail(user.email, msg);
}

// start/end は「JST 日付の UTC 00:00」保存。UTC ゲッタで JST 日付をそのまま整形する。
export function formatReserveDate(d: Date | null | undefined): string {
  if (!d) return "-";
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}/${m}/${day}`;
}

async function listName(listId: number | null | undefined): Promise<string> {
  if (listId == null) return "機材";
  const list = await db.list.findUnique({ where: { id: listId }, select: { name: true } });
  return list?.name ?? "機材";
}

type ReserveLike = {
  user_id: string | null;
  list_id: number | null;
  start: Date | null;
  end: Date | null;
};

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://abs-ems.forgeonics.com";

// 予約が確定したことを本人へ知らせる（予約作成時）。
export async function notifyReservationCreated(reserve: ReserveLike): Promise<void> {
  if (!reserve.user_id) return;
  const name = await listName(reserve.list_id);
  const period = `${formatReserveDate(reserve.start)} 〜 ${formatReserveDate(reserve.end)}`;
  await notifyUser(reserve.user_id, "reservationEvents", {
    subject: `予約を受け付けました（${name}）`,
    html: `<p>${name} の予約を受け付けました。</p><p>利用期間: ${period}</p><p><a href="${APP_URL()}/ems/mypage">マイ予約を開く</a></p>`,
    text: `${name} の予約を受け付けました。\n利用期間: ${period}\nマイ予約: ${APP_URL()}/ems/mypage`,
  });
}

// 管理者が他人の予約を取り消したことを、予約の持ち主へ知らせる。
// listNameOverride: 機材削除に伴う取り消しでは通知時点で List 行が消えているため、
// 削除前に控えた機材名を呼び出し側から渡す。
export async function notifyReservationCancelled(
  reserve: ReserveLike,
  listNameOverride?: string
): Promise<void> {
  if (!reserve.user_id) return;
  const name = listNameOverride ?? (await listName(reserve.list_id));
  const period = `${formatReserveDate(reserve.start)} 〜 ${formatReserveDate(reserve.end)}`;
  await notifyUser(reserve.user_id, "reservationEvents", {
    subject: `予約が取り消されました（${name}）`,
    html: `<p>${name} の予約（${period}）が管理者によって取り消されました。</p><p>心当たりがない場合は部の管理者にご確認ください。</p>`,
    text: `${name} の予約（${period}）が管理者によって取り消されました。\n心当たりがない場合は部の管理者にご確認ください。`,
  });
}

// 管理者が他人の予約を延長したことを、予約の持ち主へ知らせる（reserve.end は延長後の値）。
export async function notifyReservationExtended(reserve: ReserveLike): Promise<void> {
  if (!reserve.user_id) return;
  const name = await listName(reserve.list_id);
  const period = `${formatReserveDate(reserve.start)} 〜 ${formatReserveDate(reserve.end)}`;
  await notifyUser(reserve.user_id, "reservationEvents", {
    subject: `予約が延長されました（${name}）`,
    html: `<p>${name} の予約期間が管理者によって延長されました。</p><p>新しい利用期間: ${period}</p><p><a href="${APP_URL()}/ems/mypage">マイ予約を開く</a></p>`,
    text: `${name} の予約期間が管理者によって延長されました。\n新しい利用期間: ${period}\nマイ予約: ${APP_URL()}/ems/mypage`,
  });
}

// 返却期限当日のリマインダー（cron から呼ぶ）。
export async function notifyReturnReminder(reserve: ReserveLike): Promise<void> {
  if (!reserve.user_id) return;
  const name = await listName(reserve.list_id);
  await notifyUser(reserve.user_id, "returnReminder", {
    subject: `本日返却期限です（${name}）`,
    html: `<p>${name} の返却期限は本日（${formatReserveDate(reserve.end)}）です。</p><p>部室で返却手続きをお願いします。</p><p><a href="${APP_URL()}/ems/mypage">マイ予約を開く</a></p>`,
    text: `${name} の返却期限は本日（${formatReserveDate(reserve.end)}）です。\n部室で返却手続きをお願いします。\nマイ予約: ${APP_URL()}/ems/mypage`,
  });
}

/**
 * 新しい機材の追加を、notifyNewEquipment を有効にしている部員へ一斉配信する。
 * 1件の失敗が全体を止めないよう allSettled。設定行のあるユーザーだけが対象
 * （newEquipment の既定は false なので、明示的に true にした人のみ）。
 * 配信先は機材の属するワークスペースのメンバーに限定する（他団体へ漏らさない）。
 */
export async function notifyNewEquipment(list: {
  name: string | null;
  workspaceId: string;
}): Promise<void> {
  const memberIds = (
    await db.membership.findMany({
      where: { workspaceId: list.workspaceId },
      select: { userId: true },
    })
  ).map((m) => m.userId);
  const targets = await db.userSettings.findMany({
    where: {
      notifyNewEquipment: true,
      userId: { in: memberIds },
      user: { email: { not: null } },
    },
    select: { user: { select: { email: true } } },
  });
  const name = list.name ?? "新しい機材";
  const msg: MailContent = {
    subject: `新しい機材が追加されました（${name}）`,
    html: `<p>新しい機材「${name}」が追加されました。</p><p><a href="${APP_URL()}/ems/equipment-list">予約する</a></p>`,
    text: `新しい機材「${name}」が追加されました。\n予約する: ${APP_URL()}/ems/equipment-list`,
  };
  await Promise.allSettled(
    targets
      .map((t) => t.user?.email)
      .filter((e): e is string => !!e)
      .map((email) => sendMail(email, msg)),
  );
}
