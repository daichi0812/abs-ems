"use server";

import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/**
 * 現在のワークスペースを切り替える。membership を検証してから lastWorkspaceId を更新する。
 * 呼び出し側（クライアント）は成功後に useSession().update({}) → クライアントキャッシュの
 * クリア → router.refresh() を行うこと（JWT とキャッシュの両方に新 WS を反映させるため）。
 */
export const switchWorkspace = async (workspaceId: string) => {
  const user = await currentUser();
  if (!user?.id) return { error: "認証されていません。" };

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
    select: { id: true },
  });
  if (!membership) return { error: "このワークスペースには所属していません。" };

  await db.user.update({
    where: { id: user.id },
    data: { lastWorkspaceId: workspaceId },
  });
  return { success: true as const };
};

/**
 * 招待コードでワークスペースに参加する。参加後は現在のワークスペースも切り替える。
 * 既に所属している場合はエラーにせず切り替えのみ行う（リンクの再訪で壊れない）。
 */
export const acceptInvite = async (code: string) => {
  const user = await currentUser();
  if (!user?.id) return { error: "認証されていません。" };

  const invite = await db.workspaceInvite.findUnique({ where: { code } });
  if (!invite) return { error: "招待リンクが見つかりません。" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { error: "招待リンクの有効期限が切れています。管理者に再発行を依頼してください。" };
  }
  if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
    return { error: "招待リンクの使用回数が上限に達しています。" };
  }

  const already = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
    select: { id: true },
  });

  await db.$transaction(async (tx) => {
    if (!already) {
      await tx.membership.create({
        data: { userId: user.id!, workspaceId: invite.workspaceId, role: invite.role },
      });
      // 使用回数は新規参加のときだけ数える（既所属の再訪でカウントを消費しない）
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });
    }
    await tx.user.update({
      where: { id: user.id },
      data: { lastWorkspaceId: invite.workspaceId },
    });
  });

  const workspace = await db.workspace.findUnique({
    where: { id: invite.workspaceId },
    select: { name: true },
  });
  return { success: true as const, workspaceName: workspace?.name ?? "" };
};
