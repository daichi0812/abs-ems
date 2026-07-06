"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface FeedbackItem {
  id: number;
  body: string;
  path: string | null;
  resolved: boolean;
  createdAt: string; // ISO
  userName: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackList({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const toggleResolved = async (item: FeedbackItem) => {
    setPendingId(item.id);
    try {
      const res = await fetch(`/api/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: !item.resolved }),
      });
      if (!res.ok) {
        toast.error("更新に失敗しました");
        return;
      }
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, resolved: !it.resolved } : it))
      );
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  const open = items.filter((it) => !it.resolved);
  const done = items.filter((it) => it.resolved);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-faint">
        フィードバックはまだありません
      </p>
    );
  }

  const renderItem = (item: FeedbackItem) => (
    <div
      key={item.id}
      className={cn(
        "rounded-2xl bg-white p-4 shadow-sm",
        item.resolved && "opacity-60"
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
        <span className="font-bold text-ink-sub">{item.userName}</span>
        <span>{formatDate(item.createdAt)}</span>
        {item.path && (
          <span className="rounded bg-line-soft px-1.5 py-0.5 font-mono text-[10px]">
            {item.path}
          </span>
        )}
        <button
          type="button"
          disabled={pendingId === item.id}
          onClick={() => toggleResolved(item)}
          className={cn(
            "ml-auto h-7 flex-none rounded-lg px-2.5 text-[11px] font-bold transition-colors disabled:opacity-50",
            item.resolved
              ? "text-ink-muted hover:bg-line-soft"
              : "border-[1.5px] border-brand text-brand hover:bg-brand-faint"
          )}
        >
          {item.resolved ? "未対応に戻す" : "対応済みにする"}
        </button>
      </div>
      <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-relaxed">{item.body}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <section>
        <p className="mb-2 px-1 text-xs font-bold text-ink-muted">
          未対応 {open.length}件
        </p>
        <div className="flex flex-col gap-2.5">
          {open.length > 0 ? (
            open.map(renderItem)
          ) : (
            <p className="rounded-2xl bg-white p-5 text-center text-[12.5px] text-ink-faint">
              未対応はありません 🎉
            </p>
          )}
        </div>
      </section>
      {done.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-xs font-bold text-ink-muted">
            対応済み {done.length}件
          </p>
          <div className="flex flex-col gap-2.5">{done.map(renderItem)}</div>
        </section>
      )}
    </div>
  );
}
