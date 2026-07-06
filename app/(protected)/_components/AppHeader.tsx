"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SegmentNav } from "./SegmentNav";
import { UserMenu } from "./UserMenu";

// 管理系 ems ルート。これらは（デザイン 6a/6b/7b のとおり）本体側に独自タブを持つため、
// ヘッダーではメンバー用セグメントを出さず「管理者」バッジを表示する。
const ADMIN_PREFIXES = ["/ems/manager", "/ems/categories", "/ems/edit"];

export const AppHeader = () => {
  const pathname = usePathname();
  const isAdminArea = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <header className="sticky top-0 z-30 bg-navy">
      {/* PC: 1行（ブランド / セグメント / ユーザー）。スマホ: 2行（上=ブランド+ユーザー、下=セグメント）。 */}
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-3 pt-3 md:flex-row md:items-center md:gap-6 md:py-3">
        <div className="flex items-center justify-between md:justify-start md:gap-3">
          <Link
            href="/ems/mypage"
            className="text-[17px] font-black tracking-wide text-white"
          >
            ABS EMS
          </Link>
          {isAdminArea && (
            <span className="rounded-full bg-warning-gold/20 px-2 py-[3px] text-[10px] font-bold text-warning-gold">
              管理者
            </span>
          )}
          <div className="md:hidden">
            <UserMenu />
          </div>
        </div>

        {!isAdminArea && (
          <SegmentNav className="w-full md:mx-auto md:w-[400px]" />
        )}

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
