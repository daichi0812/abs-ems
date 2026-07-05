"use client";

import axios from "axios";
import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";

export interface UseTagDeletionParams {
  refetchTags: () => Promise<void>;
}

export const useTagDeletion = ({ refetchTags }: UseTagDeletionParams) => {
  // 削除確認は UI 側（AlertDialog・機材数警告付き）で行うため、ここでは確認せず削除を実行する。
  const deleteTag = async (id: number): Promise<boolean> => {
    try {
      await axios.delete(`/api/tags/${id}`, { headers: managerAuthHeaders() });
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
