import { db } from "@/lib/db";
import { JoinInviteCard } from "./_components/JoinInviteCard";

interface Params {
  params: Promise<{ code: string }>;
}

// 招待リンクの受諾ページ。未ログインなら middleware が login へ飛ばし、
// callbackUrl でここへ戻ってくる（新規部員は登録→メール確認→ログイン→この URL）。
export default async function InvitePage({ params }: Params) {
  const { code } = await params;

  const invite = await db.workspaceInvite.findUnique({ where: { code } });
  const workspace = invite
    ? await db.workspace.findUnique({
        where: { id: invite.workspaceId },
        select: { name: true },
      })
    : null;

  const expired = !!invite?.expiresAt && invite.expiresAt < new Date();
  const exhausted = invite?.maxUses != null && invite.usedCount >= invite.maxUses;
  const invalidReason = !invite || !workspace
    ? "招待リンクが見つかりません。URL をお確かめください。"
    : expired
      ? "この招待リンクは有効期限が切れています。管理者に再発行を依頼してください。"
      : exhausted
        ? "この招待リンクは使用回数の上限に達しています。管理者に再発行を依頼してください。"
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <JoinInviteCard
        code={code}
        workspaceName={workspace?.name ?? null}
        invalidReason={invalidReason}
      />
    </div>
  );
}
