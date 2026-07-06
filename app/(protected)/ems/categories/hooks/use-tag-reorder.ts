"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";
import type { Tag } from "@/types/domain";

export interface UseTagReorderParams {
  tags: Tag[];
  refetchTags: () => Promise<void>;
}

// 並び順の楽観的更新: ローカルの order を即時入れ替え、API 成功で確定・失敗で refetch により巻き戻す。
export const useTagReorder = ({ tags, refetchTags }: UseTagReorderParams) => {
  const [order, setOrder] = useState<Tag[]>(tags);
  const [isSaving, setIsSaving] = useState(false);

  // 親の tags が更新されたら（読み込み・追加・削除・編集後）ローカル order を同期。
  useEffect(() => {
    setOrder(tags);
  }, [tags]);

  const persist = async (next: Tag[]) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/tags/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...managerAuthHeaders() },
        body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
      });
      // fetch は HTTP エラーで throw しないため、明示的に catch へ流す
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refetchTags();
    } catch (err) {
      console.error("並び順の更新に失敗しました", err);
      toast.error("並び順の変更に失敗しました");
      await refetchTags(); // サーバー状態へ巻き戻し
    } finally {
      setIsSaving(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next); // 楽観的に即反映
    void persist(next);
  };

  return {
    order,
    isSaving,
    moveUp: (index: number) => move(index, -1),
    moveDown: (index: number) => move(index, 1),
  };
};
