import * as z from "zod";
import { UserSettingsSchema } from "@/schemas";

export type UserSettingsValues = z.infer<typeof UserSettingsSchema>;

// UserSettings 行が無いユーザー向けの既定値（Prisma スキーマの @default と一致させる）。
export const DEFAULT_USER_SETTINGS: UserSettingsValues = {
  notifyReturnReminder: true,
  notifyReservationEvents: true,
  notifyNewEquipment: false,
  lineNotifyEnabled: false,
  calendarDefaultView: "MONTH",
};
