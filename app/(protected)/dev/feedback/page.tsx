import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isDeveloperEmail } from "@/lib/dev-auth";
import { db } from "@/lib/db";
import { FeedbackList } from "./_components/FeedbackList";

// 開発者専用のフィードバック一覧。部長ら運用者の管理画面（/ems/manager 等、ADMIN ゲート）
// とは別系統で、DEVELOPER_EMAILS に載っている開発者だけが見られる。
// ナビからのリンクは張らず、URL 直打ちでアクセスする。
const DevFeedbackPage = async () => {
  const user = await currentUser();
  if (!isDeveloperEmail(user?.email)) {
    notFound();
  }

  const feedbacks = await db.feedback.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="min-h-full bg-surface">
      <header className="bg-navy px-4 py-3">
        <p className="mx-auto max-w-3xl text-[15px] font-black text-white">
          フィードバック
          <span className="ml-2 rounded-full bg-white/15 px-2 py-[3px] text-[10px] font-bold">
            開発者専用
          </span>
        </p>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">
        <FeedbackList
          initialItems={feedbacks.map((f) => ({
            id: f.id,
            body: f.body,
            path: f.path,
            resolved: f.resolved,
            createdAt: f.createdAt.toISOString(),
            userName: f.user?.name ?? f.user?.email ?? "退会ユーザー",
          }))}
        />
      </main>
    </div>
  );
};

export default DevFeedbackPage;
