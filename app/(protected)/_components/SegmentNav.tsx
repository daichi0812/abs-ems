"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// メンバー画面のセグメント切替。デザイン（UI刷新案 4a/5a）のピルセグメントを
// 「1画面のタブ」ではなく既存3ルートへのリンクとして実装する（ルート維持）。
const SEGMENTS = [
  { label: "予約する", href: "/ems/equipment-list" },
  { label: "カレンダー", href: "/ems/common" },
  { label: "マイ予約", href: "/ems/mypage" },
] as const;

export const SegmentNav = ({ className }: { className?: string }) => {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex rounded-xl bg-white/10 p-[3px]",
        className
      )}
    >
      {SEGMENTS.map((seg) => {
        const active = pathname.startsWith(seg.href);
        return (
          <Link
            key={seg.href}
            href={seg.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-[10px] px-3 py-2 text-center text-[13px] font-bold transition-colors",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-white/70 hover:text-white"
            )}
          >
            {seg.label}
          </Link>
        );
      })}
    </div>
  );
};
