"use client";

import { toast } from "sonner";
import { apiMutate } from "@/lib/api-mutate";

export interface UseTagDeletionParams {
  refetchTags: () => Promise<void>;
}

export const useTagDeletion = ({ refetchTags }: UseTagDeletionParams) => {
  // 削除確認は UI 側（AlertDialog・機材数警告付き）で行うため、ここでは確認せず削除を実行する。
  const deleteTag = async (id: number): Promise<boolean> => {
    try {
      await apiMutate(`/api/tags/${id}`, { method: "DELETE", manager: true });
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
