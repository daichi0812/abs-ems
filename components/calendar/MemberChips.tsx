"use client";

import { cn } from "@/lib/utils";
import { memberColor, memberInitial } from "@/lib/calendar/member-colors";

// 月カレンダーの部員絞り込みチップ。「すべて」+ 各部員。選択中の部員以外のバーを
// 呼び出し側で淡色化する（value===null で全表示）。
export interface MemberChipsProps {
  members: string[]; // 部員名の一覧
  value: string | null; // 選択中の部員名（null = すべて）
  onChange: (name: string | null) => void;
  className?: string;
}

export function MemberChips({ members, value, onChange, className }: MemberChipsProps) {
  const items: { name: string | null; label: string; initial: string; color: string }[] = [
    { name: null, label: "すべて", initial: "全", color: "#475467" },
    ...members.map((name) => ({
      name,
      label: name,
      initial: memberInitial(name),
      color: memberColor(name),
    })),
  ];

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((it) => {
        const on = value === it.name;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onChange(it.name)}
            className={cn(
              "flex h-8 flex-none items-center gap-1.5 rounded-full border py-0 pl-1.5 pr-[11px] transition-colors",
              on ? "border-ink bg-ink" : "border-line bg-white"
            )}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: it.color }}
            >
              {it.initial}
            </span>
            <span className={cn("text-[11.5px] font-bold", on ? "text-white" : "text-ink-sub")}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
