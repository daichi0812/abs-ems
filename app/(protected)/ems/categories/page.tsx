"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { categoryColor, categoryIconPath, tint } from "@/lib/category-colors";
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
import type { Tag } from "@/types/domain";
import { useTagsList } from "../_hooks/use-tags-list";
import { useEquipments } from "../_hooks/use-equipments";
import { useTagEditing } from "./hooks/use-tag-editing";
import { useTagDeletion } from "./hooks/use-tag-deletion";
import { useTagReorder } from "./hooks/use-tag-reorder";
import { useTagAdd } from "./hooks/use-tag-add";

export default function CategoriesPage() {
  const { tags, isLoading, refetch } = useTagsList();
  const { equipments } = useEquipments();
  const editing = useTagEditing({ refetchTags: refetch });
  const { deleteTag } = useTagDeletion({ refetchTags: refetch });
  const reorder = useTagReorder({ tags, refetchTags: refetch });
  const add = useTagAdd({ existingTags: tags, refetchTags: refetch });

  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  // カテゴリごとの機材数（tag_id は文字列で返るため数値化して突合）。
  const countByTagId = useMemo(() => {
    const m = new Map<number, number>();
    equipments.forEach((e) => {
      const id = Number(e.tag_id);
      if (!Number.isNaN(id)) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [equipments]);

  const rows = reorder.order;
  const pendingCount = pendingDelete ? countByTagId.get(pendingDelete.id) ?? 0 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pb-24 pt-3 md:px-5 md:pt-5">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/ems/manager"
          aria-label="機材管理へ戻る"
          className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-line bg-white text-ink-sub hover:border-brand"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="m-0 text-lg font-black text-ink">カテゴリ編集</h1>
      </div>

      <p className="mb-2.5 px-0.5 text-[11.5px] text-ink-faint">
        {rows.length}個のカテゴリ · 上下ボタンで並べ替え
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/70" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((tag, index) => {
            const color = categoryColor(tag.color);
            const isEditing = editing.editTagId === tag.id;
            const count = countByTagId.get(tag.id) ?? 0;
            return (
              <div
                key={tag.id}
                className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 px-3 shadow-sm"
              >
                {/* 並べ替え（上下） */}
                <div className="flex flex-none flex-col">
                  <button
                    type="button"
                    aria-label="上へ移動"
                    disabled={index === 0 || reorder.isSaving}
                    onClick={() => reorder.moveUp(index)}
                    className="flex h-5 w-6 items-center justify-center text-ink-faint hover:text-brand disabled:opacity-25"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 15l6-6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="下へ移動"
                    disabled={index === rows.length - 1 || reorder.isSaving}
                    onClick={() => reorder.moveDown(index)}
                    className="flex h-5 w-6 items-center justify-center text-ink-faint hover:text-brand disabled:opacity-25"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* アイコンタイル */}
                <span
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]"
                  style={{ background: tint(color) }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={categoryIconPath(tag.name)} />
                  </svg>
                </span>

                {isEditing ? (
                  <>
                    <input
                      ref={editing.inputRef}
                      value={editing.editTagName}
                      onChange={(e) => editing.setEditTagName(e.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-brand bg-white px-3 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => editing.saveEdit(tag.id)}
                      className="h-9 flex-none rounded-[10px] bg-brand px-3.5 text-[13px] font-bold text-white hover:bg-brand-dark"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      aria-label="編集をやめる"
                      onClick={editing.cancelEdit}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-line bg-white text-lg leading-none text-ink-muted"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[14px] font-bold">{tag.name}</p>
                      <p className="m-0 mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                        <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
                        機材 {count}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`${tag.name}を編集`}
                      onClick={() => editing.startEdit(tag.id, tag.name, tag.color)}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-line bg-white hover:border-brand"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475467" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={`${tag.name}を削除`}
                      onClick={() => setPendingDelete(tag)}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border-[1.5px] border-[#FEE4E2] bg-[#FFF5F4] hover:bg-[#FEE4E2]"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 新しいカテゴリ */}
      <div className="mt-3.5 rounded-2xl bg-white p-4 shadow-sm">
        <p className="m-0 mb-3 text-sm font-black text-ink">新しいカテゴリ</p>
        <p className="m-0 mb-2.5 text-xs font-bold text-ink-muted">カラー</p>
        <div className="flex flex-wrap gap-2.5">
          {add.palette.map((col) => {
            const on = add.color === col;
            return (
              <button
                key={col}
                type="button"
                aria-label={`色 ${col}`}
                onClick={() => add.setColor(col)}
                className="h-[34px] w-[34px] rounded-full p-0 transition-[border-color]"
                style={{
                  background: col,
                  border: `3px solid ${on ? col : "transparent"}`,
                  boxShadow: `inset 0 0 0 2px #fff${on ? ", 0 0 0 1.5px " + col : ""}`,
                }}
              />
            );
          })}
        </div>
        <input
          value={add.name}
          onChange={(e) => add.setName(e.target.value)}
          placeholder="カテゴリ名（例：ドローン）"
          className="mt-4 h-[46px] w-full rounded-xl border-[1.5px] border-line bg-[#F9FAFB] px-3.5 text-[15px] outline-none focus:border-brand focus:bg-white"
        />
        <button
          type="button"
          disabled={!add.canSubmit || add.isSubmitting}
          onClick={() => add.submit()}
          className={cn(
            "mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {add.isSubmitting ? "追加中…" : "カテゴリを追加"}
        </button>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>「{pendingDelete?.name}」を削除</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount > 0
                ? `このカテゴリの機材 ${pendingCount}点は「未分類」になり、予約画面では末尾の「未分類」グループに表示されます。各機材の編集画面でカテゴリを付け直せます。`
                : "この操作は取り消せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger/90"
              onClick={async () => {
                if (pendingDelete) await deleteTag(pendingDelete.id);
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
