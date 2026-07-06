"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { categoryColor, tint } from "@/lib/category-colors";
import { dayIndexToDateString, todayJstDayIndex } from "@/lib/calendar/date-grid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Equipment } from "@/types/domain";
import type { CategoryOption } from "@/app/(protected)/ems/_components/EquipmentForm";

// 機材一覧＋検索＋カテゴリ絞り込み＋編集/削除（削除は AlertDialog 確認）。
export function EquipmentListPanel({
  equipments,
  categories,
  onEdit,
  onDelete,
  gridCols = 1,
  editingId = null,
}: {
  equipments: Equipment[];
  categories: CategoryOption[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<boolean>;
  gridCols?: 1 | 2;
  /** 編集ページへ遷移中の機材ID（該当ボタンにスピナーを出す） */
  editingId?: number | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("すべて");
  const [pendingDelete, setPendingDelete] = useState<Equipment | null>(null);
  // 削除対象に今後の予約が何件あるか（null = 取得中）。警告なしで消すと
  // 部員の予約が黙って取り消されるため、ダイアログで件数を見せる
  const [pendingReserveCount, setPendingReserveCount] = useState<number | null>(null);

  const openDelete = (eq: Equipment) => {
    setPendingDelete(eq);
    setPendingReserveCount(null);
    const from = dayIndexToDateString(todayJstDayIndex());
    fetch(`/api/reserves?list_id=${eq.id}&from=${from}`)
      .then((r) => r.json())
      .then((d) => setPendingReserveCount(Array.isArray(d) ? d.length : 0))
      .catch(() => setPendingReserveCount(0));
  };

  const catById = useMemo(() => {
    const m = new Map<string, CategoryOption>();
    categories.forEach((c) => m.set(String(c.id), c));
    return m;
  }, [categories]);

  const rows = useMemo(() => {
    return equipments.filter((e) => {
      const cat = catById.get(String(e.tag_id));
      const matchQ = query === "" || e.name.toLowerCase().includes(query.toLowerCase());
      const matchC = filter === "すべて" || cat?.name === filter;
      return matchQ && matchC;
    });
  }, [equipments, query, filter, catById]);

  const filterChips = ["すべて", ...categories.map((c) => c.name)];

  return (
    <div>
      {/* 検索 */}
      <div className="mb-2.5 flex h-11 items-center gap-2.5 rounded-xl bg-white px-3.5 shadow-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="機材名で検索"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {/* カテゴリ絞り込み */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {filterChips.map((name) => {
          const on = filter === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(name)}
              className={cn(
                "h-8 flex-none rounded-full border px-3 text-xs font-medium transition-colors",
                on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-sub"
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      <p className="mb-2.5 px-0.5 text-[11.5px] text-ink-faint">{rows.length}件</p>

      <div className={cn("grid gap-2", gridCols === 2 && "md:grid-cols-2")}>
        {rows.map((eq) => {
          const cat = catById.get(String(eq.tag_id));
          const color = categoryColor(cat?.color);
          return (
            <div key={eq.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 px-3 shadow-sm">
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-base font-black"
                style={{ background: tint(color), color }}
              >
                {eq.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13.5px] font-bold">{eq.name}</p>
                <p className="m-0 mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-faint">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  {cat?.name ?? "未分類"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(eq.id)}
                disabled={editingId != null}
                aria-label={`${eq.name}を編集`}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-line bg-white hover:border-brand disabled:opacity-60"
              >
                {editingId === eq.id ? (
                  // 遷移中の表示。無反応に見えて連打されるのを防ぐ
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-brand" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475467" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => openDelete(eq)}
                aria-label={`${eq.name}を削除`}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-[#FEE4E2] bg-[#FFF5F4] hover:bg-[#FEE4E2]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                </svg>
              </button>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-8 text-center text-[13px] text-ink-faint">該当する機材がありません</p>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>「{pendingDelete?.name}」を削除</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReserveCount != null && pendingReserveCount > 0
                ? `この機材には今後の予約が ${pendingReserveCount}件 あり、削除すると予約も取り消されます。この操作は取り消せません。`
                : "この操作は取り消せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger/90"
              onClick={async () => {
                if (pendingDelete) await onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
