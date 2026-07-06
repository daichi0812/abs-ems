"use server";

import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { UserSettingsSchema } from "@/schemas";
import { DEFAULT_USER_SETTINGS, type UserSettingsValues } from "@/lib/user-settings";

// 現在ユーザーの設定を返す。未作成なら既定値（DB には書き込まない）。
export const getUserSettings = async (): Promise<UserSettingsValues> => {
  const user = await currentUser();
  if (!user?.id) return DEFAULT_USER_SETTINGS;

  const row = await db.userSettings.findUnique({ where: { userId: user.id } });
  if (!row) return DEFAULT_USER_SETTINGS;

  return {
    notifyReturnReminder: row.notifyReturnReminder,
    notifyReservationEvents: row.notifyReservationEvents,
    notifyNewEquipment: row.notifyNewEquipment,
    lineNotifyEnabled: row.lineNotifyEnabled,
    calendarDefaultView: row.calendarDefaultView,
  };
};

// 設定を upsert。lineUserId の紐付けはフェーズ6（LINE Webhook）で別途行う。
export const updateUserSettings = async (values: UserSettingsValues) => {
  const user = await currentUser();
  if (!user?.id) return { error: "認証されていません" };

  const parsed = UserSettingsSchema.safeParse(values);
  if (!parsed.success) return { error: "入力が正しくありません" };

  const data = parsed.data;

  await db.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return { success: "設定を保存しました" };
};
