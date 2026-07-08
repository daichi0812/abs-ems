"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useWorkspaceMembers, type WorkspaceMember } from "@/hooks/use-workspace-members";
import { apiMutate, ApiMutateError } from "@/lib/api-mutate";
import { canAssignRole, canManageMember } from "@/lib/workspace";
import { memberInitial } from "@/lib/calendar/member-colors";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "オーナー",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};
const ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
];

/**
 * ワークスペースのメンバー管理（設定ページの管理者ブロック内）。
 * ロール変更と除名。ルールはサーバーと同じ lib/workspace.ts の純関数で出し分ける
 * （最終的な強制はサーバー側 /api/workspaces/current/members/[userId]）。
 */
export function WorkspaceMembers() {
  const user = useCurrentUser();
  const { update } = useSession();
  const { members, isLoading, refetch } = useWorkspaceMembers();
  const myRole = user?.workspaceRole ?? WorkspaceRole.MEMBER;

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);

  const changeRole = async (member: WorkspaceMember, role: WorkspaceRole) => {
    if (pendingId || role === member.role) return;
    setPendingId(member.userId);
    try {
      await apiMutate(`/api/workspaces/current/members/${member.userId}`, {
        method: "PATCH",
        body: { role },
      });
      toast.success(`${member.name ?? "メンバー"}のロールを${ROLE_LABEL[role]}に変更しました`);
      await refetch();
      // 自分のロールを変えた場合はセッション（メニューの出し分け等）へ即反映
      if (member.userId === user?.id) await update({});
    } catch (e) {
      toast.error(e instanceof ApiMutateError ? e.message : "ロールの変更に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  const removeMember = async (member: WorkspaceMember) => {
    setPendingId(member.userId);
    try {
      await apiMutate(`/api/workspaces/current/members/${member.userId}`, {
        method: "DELETE",
      });
      toast.success(`${member.name ?? "メンバー"}を除名しました`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof ApiMutateError ? e.message : "除名に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) {
    return <p className="m-0 py-2 text-[11.5px] text-ink-faint">読み込み中…</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {members.map((m) => {
          const isSelf = m.userId === user?.id;
          const canManage = canManageMember(myRole, m.role);
          return (
            <div key={m.userId} className="flex items-center gap-2.5 py-1.5">
              {m.image ? (
                <Image
                  src={m.image}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 flex-none rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {memberInitial(m.name)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
                {m.name ?? "（名前未設定）"}
                {isSelf && <span className="ml-1 text-[10.5px] font-semibold text-ink-faint">自分</span>}
              </span>
              {canManage ? (
                <Select
                  value={m.role}
                  onValueChange={(v) => void changeRole(m, v as WorkspaceRole)}
                  disabled={pendingId !== null}
                >
                  <SelectTrigger className="h-8 w-[104px] flex-none rounded-lg text-[11.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r === m.role || canAssignRole(myRole, r)).map((r) => (
                      <SelectItem key={r} value={r} className="text-[12px]">
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // ADMIN から見た OWNER の行など、操作不可の相手はロールを表示のみ
                <span className="flex-none px-2 text-[11.5px] font-semibold text-ink-faint">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
              {canManage && !isSelf && (
                <button
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => setRemoveTarget(m)}
                  className="h-8 flex-none rounded-lg px-2 text-[11px] font-bold text-danger transition-colors hover:bg-[#FEF3F2] disabled:opacity-50"
                >
                  除名
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={removeTarget != null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent className="max-w-[360px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">メンバーを除名しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px]">
              「{removeTarget?.name ?? "このメンバー"}」をワークスペースから除名します。
              本人はこのワークスペースの機材・予約にアクセスできなくなります
              （過去の予約履歴は記録として残ります）。再参加には招待リンクが必要です。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger/90"
              onClick={() => {
                if (removeTarget) void removeMember(removeTarget);
                setRemoveTarget(null);
              }}
            >
              除名する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
