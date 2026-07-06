"use client";

import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";

export interface UseTagDeletionParams {
  refetchTags: () => Promise<void>;
}

export const useTagDeletion = ({ refetchTags }: UseTagDeletionParams) => {
  // 削除確認は UI 側（AlertDialog・機材数警告付き）で行うため、ここでは確認せず削除を実行する。
  const deleteTag = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
        headers: managerAuthHeaders(),
      });
      // fetch は HTTP エラーで throw しないため、明示的に catch へ流す
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("カテゴリを削除しました");
      await refetchTags();
      return true;
    } catch (err) {
      console.error("カテゴリの削除に失敗しました.", err);
      toast.error("カテゴリの削除に失敗しました");
      return false;
    }
  };

  return { deleteTag };
};
