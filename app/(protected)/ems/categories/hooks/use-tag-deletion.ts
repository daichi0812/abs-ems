"use client";

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";

export interface UseTagDeletionParams {
  refetchTags: () => Promise<void>;
}

export const useTagDeletion = ({ refetchTags }: UseTagDeletionParams) => {
  const deleteTag = async (id: number) => {
    const confirmed = window.confirm(
      "機材に登録されたカテゴリが失われます.\n本当にこのカテゴリを削除しますか？",
    );
    if (confirmed) {
      try {
        await axios.delete(`/api/tags/${id}`, { headers: managerAuthHeaders() });
        alert("カテゴリが削除されました.");
        await refetchTags();
      } catch (err) {
        console.error("カテゴリの削除に失敗しました.", err);
        alert("カテゴリの削除に失敗しました.");
      }
    }
  };

  return { deleteTag };
};
