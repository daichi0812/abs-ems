import { UserRole } from "@prisma/client";
import * as z from "zod";

import { MEMBER_PALETTE } from "@/lib/calendar/member-colors";

export const SettingsSchema = z.object({
    name: z.optional(z.string()),
    isTwoFactorEnabled: z.optional(z.boolean()),
    role: z.enum([UserRole.ADMIN, UserRole.USER]),
    // カレンダーのテーマカラー。パレット外の任意色は受け付けない
    // （「色＝人」の視認性とダーク文字色の判定をパレット前提で保っているため）。
    // null は「自動（名前ハッシュ）」へ戻す
    color: z.optional(z.nullable(z.enum(MEMBER_PALETTE))),
    email: z.optional(z.string().email()),
    password: z.optional(z.string().min(10, {
        message: "10文字以上のパスワードにしてください"
    })),
    newPassword: z.optional(z.string().min(10, {
        message: "10文字以上のパスワードにしてください"
    })),
})
    .refine((data) => {
        if (data.password && !data.newPassword) {
            return false;
        }

        return true;
    }, {
        message: "新しいパスワードを入力してください！",
        path: ["newPassword"]
    })
    .refine((data) => {
        if (data.newPassword && !data.password) {
            return false;
        }

        return true;
    }, {
        message: "新しいパスワードを入力してください！",
        path: ["password"]
    })

export const UserSettingsSchema = z.object({
    notifyReturnReminder: z.boolean(),
    notifyReservationEvents: z.boolean(),
    notifyNewEquipment: z.boolean(),
    lineNotifyEnabled: z.boolean(),
    calendarDefaultView: z.enum(["MONTH", "GANTT"]),
})

export const NewPasswordSchema = z.object({
    password: z.string().min(10, {
        message: "10文字以上のパスワードにしてください"
    }),
})

export const ResetSchema = z.object({
    email: z.string().email({
        message: "メールアドレスを入力してください"
    }),
})

export const LoginSchema = z.object({
    email: z.string().email({
        message: "メールアドレスを入力してください"
    }),
    password: z.string().min(1, {
        message: "パスワードを入力してください"
    }),
    code: z.optional(z.string()),
})

export const RegisterSchema = z.object({
    email: z.string().email({
        message: "メールアドレスを入力してください"
    }),
    password: z.string().min(10, {
        message: "10文字以上のパスワードにしてください"
    }),
    name: z.string().min(1, {
        message: "名前を入力してください"
    })
})
export const FeedbackSchema = z.object({
    body: z.string().trim().min(1, {
        message: "内容を入力してください"
    }).max(2000, {
        message: "2000文字以内で入力してください"
    }),
    path: z.string().max(200).optional(),
})

// カテゴリ（Tag）の作成・更新の入力。API に届いた body をそのまま Prisma へ
// 流し込む（...tag スプレッド）と任意カラムを注入できてしまうため、name / color
// だけを受け付ける allowlist として使う。sortOrder はサーバー側で採番する。
export const TagSchema = z.object({
    name: z.string().trim().min(1, {
        message: "カテゴリ名を入力してください"
    }).max(50, {
        message: "カテゴリ名は50文字以内で入力してください"
    }),
    color: z.string().trim().min(1, {
        message: "色を指定してください"
    }),
})

export const WorkspaceSchema = z.object({
    name: z.string().trim().min(1, {
        message: "ワークスペース名を入力してください"
    }).max(50, {
        message: "ワークスペース名は50文字以内で入力してください"
    }),
})

export const MemberRoleSchema = z.object({
    role: z.enum(["OWNER", "ADMIN", "MEMBER"], {
        message: "ロールの指定が不正です",
    }),
})
