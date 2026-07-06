"use client";

import Image from "next/image";
import { tint } from "@/lib/category-colors";
import type { CartItem } from "./types";

// 予約ウィザード Step3: カート確認 → 予約確定。
export function ConfirmPanel({
  cartItems,
  rangeText,
  days,
  onRemove,
  onSubmit,
  isSubmitting,
  emptyHint = "機材を選択すると、ここに追加されます",
}: {
  cartItems: CartItem[];
  rangeText: string;
  days: number;
  onRemove: (id: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  emptyHint?: string;
}) {
  const canSubmit = cartItems.length > 0 && !isSubmitting;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="m-0 text-[11px] text-ink-muted">利用期間</p>
      <p className="m-0 mb-3 text-lg font-black">
        {rangeText || "—"}
        {days > 0 && <span className="ml-1 text-xs font-medium text-ink-muted">{days}日間</span>}
      </p>

      <p className="m-0 mb-2 text-[11px] text-ink-muted">機材 {cartItems.length}件</p>
      <div className="flex min-h-[56px] flex-col gap-2">
        {cartItems.length === 0 ? (
          <p className="m-0 py-2 px-0.5 text-[11.5px] text-ink-faint">{emptyHint}</p>
        ) : (
          cartItems.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2">
              {c.image ? (
                <span className="relative h-[38px] w-[38px] flex-none overflow-hidden rounded-[10px] bg-white">
                  <Image src={c.image} alt="" fill sizes="38px" className="object-cover" unoptimized />
                </span>
              ) : (
                <span
                  className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px]"
                  style={{ background: tint(c.color) }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={c.iconPath} />
                  </svg>
                </span>
              )}
              <span className="flex-1 truncate text-[13.5px] font-bold">{c.name}</span>
              {/* 見た目は26pxの丸のまま、タップ領域だけ44px相当に広げる（行の高さは -my で相殺） */}
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                aria-label={`${c.name}を外す`}
                className="-my-2 -mr-1.5 flex h-11 w-11 flex-none items-center justify-center"
              >
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#EAECF0] text-[13px] text-ink-muted">
                  ×
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="mt-3 h-12 w-full rounded-xl bg-brand text-[15px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(46,144,250,.5)] transition-colors hover:bg-brand-dark disabled:opacity-40 disabled:shadow-none"
      >
        {isSubmitting ? "予約中…" : "この内容で予約する"}
      </button>
    </div>
  );
}
