"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentRole } from "@/hooks/use-current-role";
import { memberInitial } from "@/lib/calendar/member-colors";

import { FeedbackDialog } from "./FeedbackDialog";
import { ManagerKeyDialog } from "./ManagerKeyDialog";

// 部員からの問い合わせ先（Google フォーム）。旧ヘッダーから引き継ぎ。
const CONTACT_FORM_URL = "https://forms.gle/PXWDC8aqz6Km48wW8";

export const UserMenu = () => {
  const user = useCurrentUser();
  const role = useCurrentRole();
  const isAdmin = role === UserRole.ADMIN;

  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const onLogout = () => {
    // logout-button.tsx と同じ理由でクライアント版 signOut を使う
    // （middleware 経由の cookie 再発行で削除が打ち消される問題の回避）。
    signOut({ redirectTo: "/auth/login" });
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

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />

      <ManagerKeyDialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen} />
    </>
  );
};
