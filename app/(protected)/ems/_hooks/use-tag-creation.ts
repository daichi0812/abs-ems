"use client";

import axios from "axios";
import { useState } from "react";

/**
 * 重複チェックに必要な最小フィールドだけを要求する構造的型。
 * manager (id: string) と edit (id: number) の両方の Tag 型を受け入れる。
 */
interface TagLike {
  name: string;
}

export interface UseTagCreationParams {
  existingTags: readonly TagLike[];
  refetchTags: () => Promise<void>;
}

export const useTagCreation = ({ existingTags, refetchTags }: UseTagCreationParams) => {
  const [addTagName, setAddTagName] = useState<string>("");
  const [editTagColor, setEditTagColor] = useState<string>("");

  const submit = async () => {
    if (addTagName === "") {
      alert("カテゴリ名は1文字以上入力してください.");
      setAddTagName("");
      return;
    }

    const isDuplicate = existingTags.some((tag) => tag.name === addTagName.trim());
    if (isDuplicate) {
      alert("このカテゴリは既に存在しています.");
      setAddTagName("");
      return;
    }

    await axios.post("/api/tags", {
      name: addTagName,
      color: editTagColor,
    });
    setAddTagName("");
    setEditTagColor("");
    await refetchTags();
  };

  return {
    addTagName,
    setAddTagName,
    editTagColor,
    setEditTagColor,
    submit,
  };
};
