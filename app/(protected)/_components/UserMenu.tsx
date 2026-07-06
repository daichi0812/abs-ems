"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { IoSettingsOutline } from "react-icons/io5";
import { ExitIcon } from "@radix-ui/react-icons";
import { HiOutlineWrenchScrewdriver } from "react-icons/hi2";
import { LuTags, LuMessageCircleQuestion, LuMegaphone } from "react-icons/lu";
import { UserRole } from "@prisma/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentRole } from "@/hooks/use-current-role";
import { memberInitial } from "@/lib/calendar/member-colors";

// 部員からの問い合わせ先（Google フォーム）。旧ヘッダーから引き継ぎ。
const CONTACT_FORM_URL = "https://forms.gle/PXWDC8aqz6Km48wW8";

export const UserMenu = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  const role = useCurrentRole();
  const isAdmin = role === UserRole.ADMIN;

  // 非 ADMIN 向けの管理者パスワード入力（NEXT_PUBLIC_MANAGER_KEY フォールバック。
  // 運用者への role=ADMIN 付与が整ったら退役する。lib/manager-auth.ts と同じ位置づけ）。
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [managerKey, setManagerKey] = useState("");

  // アプリ内フィードバック（本文1欄だけの最小ダイアログ。名前・ページは自動付与）
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBody, setFeedbackBody] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  const onSubmitFeedback = async () => {
    const body = feedbackBody.trim();
    if (!body) {
      toast.error("内容を入力してください");
      return;
    }
    setFeedbackSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, path: pathname }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "送信に失敗しました");
        return;
      }
      toast.success("フィードバックを送信しました。ありがとうございます！");
      setFeedbackBody("");
      setFeedbackOpen(false);
    } catch {
      toast.error("送信に失敗しました");
    } finally {
      setFeedbackSending(false);
    }
  };

  const onLogout = () => {
    // logout-button.tsx と同じ理由でクライアント版 signOut を使う
    // （middleware 経由の cookie 再発行で削除が打ち消される問題の回避）。
    signOut({ redirectTo: "/auth/login" });
  };

  const onSubmitManagerKey = () => {
    if (managerKey === process.env.NEXT_PUBLIC_MANAGER_KEY) {
      setKeyDialogOpen(false);
      setManagerKey("");
      router.push("/ems/manager");
    } else {
      toast.error("パスワードが間違っています");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="ユーザーメニュー"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand text-[13px] font-bold text-white outline-none ring-offset-navy focus-visible:ring-2 focus-visible:ring-white/60"
          // アイコン未設定ならテーマカラー（設定ページで選択）をイニシャルの背景にする
          style={!user?.image && user?.color ? { background: user.color } : undefined}
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            memberInitial(user?.name)
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" align="end">
          <DropdownMenuLabel className="truncate">
            {user?.name ?? "ゲスト"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin ? (
            <>
              <DropdownMenuItem asChild>
                <Link href="/ems/manager">
                  <HiOutlineWrenchScrewdriver className="mr-2 h-4 w-4" />
                  機材管理
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ems/categories">
                  <LuTags className="mr-2 h-4 w-4" />
                  カテゴリ編集
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setKeyDialogOpen(true)}>
                <HiOutlineWrenchScrewdriver className="mr-2 h-4 w-4" />
                管理者用ページ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
            <LuMegaphone className="mr-2 h-4 w-4" />
            フィードバックを送る
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer">
              <LuMessageCircleQuestion className="mr-2 h-4 w-4" />
              お問い合わせ
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <IoSettingsOutline className="mr-2 h-4 w-4" />
              設定
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onLogout}
            className="text-danger focus:text-danger"
          >
            <ExitIcon className="mr-2 h-4 w-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">フィードバックを送る</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              不具合・使いにくい点・要望など、気づいたことをそのままどうぞ。
              開発者にそのまま届きます。
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={feedbackBody}
            onChange={(e) => setFeedbackBody(e.target.value)}
            placeholder="例）予約の画面で◯◯が押しづらい、△△できると嬉しい など"
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-xl border-[1.5px] border-line px-3 py-2.5 text-[13.5px] outline-none focus:border-brand"
            autoFocus
          />
          <button
            type="button"
            onClick={onSubmitFeedback}
            disabled={feedbackSending || feedbackBody.trim().length === 0}
            className="h-11 w-full rounded-xl bg-brand text-[14px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {feedbackSending ? "送信中…" : "送信する"}
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">管理者用ページ</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              管理者パスワードを入力してください。
            </DialogDescription>
          </DialogHeader>
          <input
            type="password"
            value={managerKey}
            onChange={(e) => setManagerKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitManagerKey()}
            placeholder="パスワード"
            className="h-11 w-full rounded-xl border-[1.5px] border-line px-3 text-[14px] outline-none focus:border-brand"
            autoFocus
          />
          <button
            type="button"
            onClick={onSubmitManagerKey}
            className="h-11 w-full rounded-xl bg-brand text-[14px] font-bold text-white transition-colors hover:bg-brand-dark"
          >
            開く
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};
