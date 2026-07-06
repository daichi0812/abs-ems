"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { tint } from "@/lib/category-colors";
import type { PickGroup } from "./types";

// 予約ウィザード Step2: 期間中に空いている機材をカテゴリ別に表示して選ぶ。
export function EquipmentPickPanel({
  groups,
  rangeOk,
  onToggle,
  emptyHint = "まず期間を選択してください",
}: {
  groups: PickGroup[];
  rangeOk: boolean;
  onToggle: (id: number) => void;
  emptyHint?: string;
}) {
  if (!rangeOk) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line-strong bg-surface px-4 text-center text-[13px] text-ink-faint">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.catId}>
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
            <span className="text-xs font-bold text-ink-sub">{g.catName}</span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {g.items.map((it) => (
              <button
                key={it.id}
                type="button"
                disabled={!it.free}
                onClick={() => it.free && onToggle(it.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-line-soft px-3.5 py-3 text-left last:border-b-0 transition-colors",
                  it.selected && "bg-[#F5FAFF]",
                  !it.free && "cursor-default opacity-45"
                )}
              >
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: it.selected ? "#2E90FA" : "#D0D5DD",
                    background: it.selected ? "#2E90FA" : "#fff",
                  }}
                >
                  {it.selected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
                {it.image ? (
                  <span className="relative h-[52px] w-[52px] flex-none overflow-hidden rounded-xl bg-surface">
                    <Image src={it.image} alt="" fill sizes="52px" className="object-cover" unoptimized />
                  </span>
                ) : (
                  <span
                    className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-xl"
                    style={{ background: tint(g.color) }}
                  >
                    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke={g.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d={g.iconPath} />
                    </svg>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{it.name}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-muted line-clamp-2">
                    {it.detail}
                  </span>
                  <span
                    className="mt-0.5 block text-[11px] font-semibold"
                    style={{ color: it.free ? "#067647" : "#B42318" }}
                  >
                    {it.sub}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
