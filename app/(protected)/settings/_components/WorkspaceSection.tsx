"use client";

import { useState } from "react";
import Link from "next/link";
import { WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/use-current-user";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

// 設定ページの「ワークスペース」セクション。
// 現在のワークスペースと自分のロールを表示し、OWNER/ADMIN は招待リンクを発行できる。
export function WorkspaceSection() {
  const user = useCurrentUser();
  const isManager =
    user?.workspaceRole === WorkspaceRole.OWNER ||
    user?.workspaceRole === WorkspaceRole.ADMIN;

  const [issuing, setIssuing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const onIssue = async () => {
    if (issuing) return;
    setIssuing(true);
    try {
      const res = await fetch("/api/workspaces/current/invites", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "招待リンクの発行に失敗しました");
        return;
      }
      setInviteUrl(data.url);
    } finally {
      setIssuing(false);
    }
  };

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("招待リンクをコピーしました");
    } catch {
      toast.error("コピーできませんでした。リンクを長押し/選択してコピーしてください");
    }
  };

  return (
    <div className="rounded-2xl bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3 border-b border-line-soft py-3.5">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-bold text-ink">
            {user?.currentWorkspaceName ?? "（未所属）"}
          </p>
          <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-ink-faint">
            あなたのロール: {user?.workspaceRole ? ROLE_LABEL[user.workspaceRole] : "－"}
          </p>
        </div>
      </div>

      {isManager && (
        <div className="border-b border-line-soft py-3.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-bold text-ink">メンバーを招待</p>
              <p className="m-0 mt-0.5 text-[11.5px] leading-snug text-ink-faint">
                招待リンク（7日間有効）を発行して、LINE などで共有できます
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onIssue()}
              disabled={issuing}
              className="h-8 flex-none rounded-lg border-[1.5px] border-brand px-3 text-[11.5px] font-bold text-brand transition-colors hover:bg-brand-faint disabled:opacity-50"
            >
              {issuing ? "発行中…" : "リンクを発行"}
            </button>
          </div>
          {inviteUrl && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-muted">
                {inviteUrl}
              </span>
              <button
                type="button"
                onClick={() => void onCopy()}
                className="h-7 flex-none rounded-lg bg-brand px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-dark"
              >
                コピー
              </button>
            </div>
          )}
        </div>
      )}

      <div className="py-3.5">
        <Link href="/workspaces/new" className="text-[12.5px] font-bold text-brand">
          新しいワークスペースを作成
        </Link>
      </div>
    </div>
  );
}
