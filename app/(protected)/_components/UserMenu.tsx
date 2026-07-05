"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { IoSettingsOutline } from "react-icons/io5";
import { ExitIcon } from "@radix-ui/react-icons";
import { HiOutlineWrenchScrewdriver } from "react-icons/hi2";
import { UserRole } from "@prisma/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentRole } from "@/hooks/use-current-role";

/** 名前の先頭1文字をアバターのイニシャルにする（デザイン準拠）。 */
function initialOf(name?: string | null) {
  return name?.trim()?.[0] ?? "?";
}

export const UserMenu = () => {
  const user = useCurrentUser();
  const role = useCurrentRole();
  const isAdmin = role === UserRole.ADMIN;

  const onLogout = () => {
    // logout-button.tsx と同じ理由でクライアント版 signOut を使う
    // （middleware 経由の cookie 再発行で削除が打ち消される問題の回避）。
    signOut({ redirectTo: "/auth/login" });
  };

  return (
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
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/ems/manager">
                <HiOutlineWrenchScrewdriver className="mr-2 h-4 w-4" />
                機材管理
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ems/categories">
                <HiOutlineWrenchScrewdriver className="mr-2 h-4 w-4" />
                カテゴリ編集
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
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
  );
};
