"use client";

import * as z from "zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";

import { SettingsSchema } from "@/schemas";
import { settings } from "@/actions/settings";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";

// メール・パスワード・2段階認証のアカウント設定。OAuth ユーザーには表示しない。
// 既存の settings Server Action と SettingsSchema をそのまま利用（バリデーション温存）。
export function AccountSection() {
  const user = useCurrentUser();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const form = useForm<z.infer<typeof SettingsSchema>>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      password: undefined,
      newPassword: undefined,
      email: user?.email || undefined,
      role: (user?.role as UserRole) || UserRole.USER,
      isTwoFactorEnabled: user?.isTwoFactorEnabled || undefined,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email || "",
        role: (user.role as UserRole) || UserRole.USER,
        isTwoFactorEnabled: user.isTwoFactorEnabled || false,
      });
    }
  }, [user, form]);

  const onSubmit = (values: z.infer<typeof SettingsSchema>) => {
    setMessage(null);
    startTransition(() => {
      settings(values)
        .then((data) => {
          if (data.error) {
            setMessage({ kind: "error", text: data.error });
            toast.error(data.error);
          }
          if (data.success) {
            // 引数なしの update() は GET になり jwt コールバックが DB を再照会しない。
            // update({}) の POST で trigger="update" を立てて最新値をセッションに反映する。
            update({});
            setMessage({ kind: "success", text: data.success });
            toast.success(data.success);
          }
        })
        .catch(() => {
          setMessage({ kind: "error", text: "エラーが発生しました" });
          toast.error("エラーが発生しました");
        });
    });
  };

  if (user?.isOAuth === true) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-ink-muted">メールアドレス</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="daichi@example.com"
                  disabled={isPending}
                  className="h-11 rounded-xl border-line bg-[#F9FAFB] text-[15px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-ink-muted">現在のパスワード</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-11 rounded-xl border-line bg-[#F9FAFB] text-[15px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-ink-muted">新しいパスワード</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="••••••••"
                  disabled={isPending}
                  className="h-11 rounded-xl border-line bg-[#F9FAFB] text-[15px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isTwoFactorEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-line p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-bold text-ink">2段階認証</FormLabel>
                <FormDescription className="text-[11.5px] text-ink-faint">
                  ログイン時にワンタイムコードを要求します
                </FormDescription>
              </div>
              <FormControl>
                <Switch disabled={isPending} checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {message && (
          <p
            className={
              message.kind === "error"
                ? "rounded-lg bg-[#FFF5F4] px-3 py-2 text-[13px] text-danger"
                : "rounded-lg bg-[#EBFCF3] px-3 py-2 text-[13px] text-success"
            }
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-xl bg-ink text-sm font-bold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {isPending ? "更新中…" : "アカウント情報を更新"}
        </button>
      </form>
    </Form>
  );
}
