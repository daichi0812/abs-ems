"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/use-current-user";
import { clearClientCache } from "@/lib/client-cache";

// ワークスペースの新規作成ページ。
// 未所属ユーザー（登録直後・招待待ち）は /ems/* から自動でここに案内される。
// 既所属ユーザーもヘッダーのスイッチャーから2つ目以降を作成できる。
export default function NewWorkspacePage() {
  const router = useRouter();
  const { update } = useSession();
  const user = useCurrentUser();
  const hasWorkspace = !!user?.currentWorkspaceId;

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || name.trim().length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "ワークスペースの作成に失敗しました");
        return;
      }
      // 新ワークスペースに切り替わった状態でマイページへ
      clearClientCache();
      await update({});
      toast.success(`ワークスペース「${data.name}」を作成しました`);
      router.push("/ems/mypage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="m-0 text-[17px] font-black">ワークスペースを作成</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            {hasWorkspace
              ? "新しい団体用のワークスペースを作成します。作成した人がオーナーになります。"
              : "所属しているワークスペースがまだありません。新しく作成するか、団体の管理者から届いた招待リンクから参加してください。"}
          </p>
          <form onSubmit={onSubmit} className="mt-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-ink-muted">
                ワークスペース名（団体名）
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="例: ○○放送部"
                className="h-11 w-full rounded-xl border-[1.5px] border-line bg-white px-3 text-[13.5px] outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || name.trim().length === 0}
              className="mt-4 h-11 w-full rounded-xl bg-brand text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? "作成中…" : "作成する"}
            </button>
          </form>
        </div>

        {!hasWorkspace && (
          <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-faint">
            招待リンクをお持ちの場合は、そのリンクを開くと参加できます。
          </p>
        )}
        {hasWorkspace && (
          <p className="mt-4 text-center">
            <Link href="/ems/mypage" className="text-[12.5px] font-bold text-brand">
              マイ予約に戻る
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
