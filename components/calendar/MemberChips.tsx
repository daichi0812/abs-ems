"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { memberColor, memberInitial } from "@/lib/calendar/member-colors";

// 月カレンダーの部員絞り込みチップ。「すべて」+ 各部員。選択中の部員以外のバーを
// 呼び出し側で淡色化する（value===null で全表示）。
// 人数が多い月はスマホで縦に膨らむため、上限を超えたら折りたたみ「他N人」で展開する。
export interface MemberChipsProps {
  members: string[]; // 部員名の一覧
  value: string | null; // 選択中の部員名（null = すべて）
  onChange: (name: string | null) => void;
  className?: string;
  /** 折りたたみ時に表示するチップ数の上限（「すべて」を含む。おおよそ2行分） */
  collapseLimit?: number;
  /** バー側と同じ色割り当て（memberColorMap）を使う場合に渡す。省略時はハッシュ色 */
  colorOf?: (name: string) => string;
}

export function MemberChips({
  members,
  value,
  onChange,
  className,
  collapseLimit = 10,
  colorOf = memberColor,
}: MemberChipsProps) {
  const [expanded, setExpanded] = useState(false);

  const items: { name: string | null; label: string; initial: string; color: string }[] = [
    { name: null, label: "すべて", initial: "全", color: "#475467" },
    ...members.map((name) => ({
      name,
      label: name,
      initial: memberInitial(name),
      color: colorOf(name),
    })),
  ];

  let overflow = items.length > collapseLimit;
  let shown = items;
  if (overflow && !expanded) {
    shown = items.slice(0, collapseLimit);
    // 選択中の部員が折りたたみで隠れると「何で絞っているか」が見えなくなるので末尾に足す
    if (value != null && !shown.some((it) => it.name === value)) {
      const selected = items.find((it) => it.name === value);
      if (selected) shown = [...shown, selected];
    }
    // 選択中チップの補完で結局全員が表示されるケースでは「他0人」ボタンを出さない
    if (shown.length === items.length) overflow = false;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((it) => {
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
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-8 flex-none items-center rounded-full border border-dashed border-line-strong bg-white px-3 text-[11.5px] font-bold text-ink-muted"
        >
          {expanded ? "折りたたむ" : `他${items.length - shown.length}人`}
        </button>
      )}
    </div>
  );
}
