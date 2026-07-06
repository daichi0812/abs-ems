"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { IoSettingsOutline } from "react-icons/io5";
import { ExitIcon } from "@radix-ui/react-icons";
import { HiOutlineWrenchScrewdriver } from "react-icons/hi2";
import { LuTags, LuMessageCircleQuestion } from "react-icons/lu";
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

// 部員からの問い合わせ先（Google フォーム）。旧ヘッダーから引き継ぎ。
const CONTACT_FORM_URL = "https://forms.gle/PXWDC8aqz6Km48wW8";

/** 名前の先頭1文字をアバターのイニシャルにする（デザイン準拠）。 */
function initialOf(name?: string | null) {
  return name?.trim()?.[0] ?? "?";
}

export const UserMenu = () => {
  const router = useRouter();
  const user = useCurrentUser();
  const role = useCurrentRole();
  const isAdmin = role === UserRole.ADMIN;

  // 非 ADMIN 向けの管理者パスワード入力（NEXT_PUBLIC_MANAGER_KEY フォールバック。
  // 運用者への role=ADMIN 付与が整ったら退役する。lib/manager-auth.ts と同じ位置づけ）。
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [managerKey, setManagerKey] = useState("");

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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white outline-none ring-offset-navy focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {initialOf(user?.name)}
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
