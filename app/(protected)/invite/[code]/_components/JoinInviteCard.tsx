"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { acceptInvite } from "@/actions/workspace";
import { clearClientCache } from "@/lib/client-cache";

interface JoinInviteCardProps {
  code: string;
  workspaceName: string | null;
  /** null なら有効な招待。文字列なら参加ボタンを出さずに理由を表示する */
  invalidReason: string | null;
}

export function JoinInviteCard({ code, workspaceName, invalidReason }: JoinInviteCardProps) {
  const router = useRouter();
  const { update } = useSession();
  const [joining, setJoining] = useState(false);

  const onJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      const res = await acceptInvite(code);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      clearClientCache();
      await update({});
      toast.success(`「${res.workspaceName}」に参加しました`);
      router.push("/ems/mypage");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 text-center shadow-sm">
      {invalidReason ? (
        <>
          <h1 className="m-0 text-[16px] font-black">招待リンクが無効です</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{invalidReason}</p>
          <Link
            href="/ems/mypage"
            className="mt-5 block text-[12.5px] font-bold text-brand"
          >
            ホームへ
          </Link>
        </>
      ) : (
        <>
          <p className="m-0 text-[12px] font-bold text-ink-faint">ワークスペースへの招待</p>
          <h1 className="mt-1.5 text-[19px] font-black">{workspaceName}</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            参加すると、このワークスペースの機材予約が利用できるようになります。
          </p>
          <button
            type="button"
            onClick={() => void onJoin()}
            disabled={joining}
            className="mt-5 h-11 w-full rounded-xl bg-brand text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {joining ? "参加中…" : "参加する"}
          </button>
        </>
      )}
    </div>
  );
}
