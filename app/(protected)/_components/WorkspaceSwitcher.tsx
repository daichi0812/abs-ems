"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMyWorkspaces } from "@/hooks/use-my-workspaces";
import { clearClientCache } from "@/lib/client-cache";
import { switchWorkspace } from "@/actions/workspace";

// ヘッダー左上のブランド枠。現在のワークスペース名を表示し、複数所属のときだけ
// 切替ドロップダウンになる（所属1件の部員には従来どおり静的なテキスト＝UI無変化）。
export const WorkspaceSwitcher = () => {
  const router = useRouter();
  const { update } = useSession();
  const user = useCurrentUser();
  const { workspaces } = useMyWorkspaces();
  const [switching, setSwitching] = useState(false);

  // セッション由来なので fetch を待たず即描画できる（null は読み込み中/未所属）
  const name = user?.currentWorkspaceName ?? "EMS";
  const brandClass = "text-[17px] font-black tracking-wide text-white";

  if (workspaces.length <= 1) {
    return (
      <Link href="/ems/mypage" className={brandClass}>
        {name}
      </Link>
    );
  }

  const onSwitch = async (workspaceId: string) => {
    if (switching || workspaceId === user?.currentWorkspaceId) return;
    setSwitching(true);
    try {
      const res = await switchWorkspace(workspaceId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      // 前のワークスペースの機材・予約キャッシュを持ち越さない
      clearClientCache();
      // update({}) で JWT を再照会させる（引数なしだと GET になり trigger が立たない）
      await update({});
      router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${brandClass} flex items-center gap-1 outline-none ring-offset-navy focus-visible:ring-2 focus-visible:ring-white/60`}
        aria-label="ワークスペースを切り替え"
        disabled={switching}
      >
        {name}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 opacity-70">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => void onSwitch(ws.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">{ws.name}</span>
            {ws.id === user?.currentWorkspaceId && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-brand">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/workspaces/new">新しいワークスペースを作成</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
