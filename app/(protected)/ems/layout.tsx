import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/app/(protected)/_components/AppHeader";

// /ems/* 共通レイアウト。従来は各ページが個別に <Header /> を import していたが、
// 共通ヘッダー（AppHeader）をここに巻き上げる。背景は surface トークン。
//
// ワークスペース未所属のユーザー（登録直後・招待待ち）は機材・予約のどのページも
// 使えないため、案内ページへ送る。セッションの currentWorkspaceId は最大15分古い
// （旧 JWT には無い）ので、null のときだけ DB で所属の有無を確かめてから送る
// （既ログインの部員をデプロイ直後に誤リダイレクトしないため）。
export default async function EmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId && !session.user.currentWorkspaceId) {
    const membership = await db.membership.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!membership) redirect("/workspaces/new");
  }

  return (
    <div className="min-h-full bg-surface">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
