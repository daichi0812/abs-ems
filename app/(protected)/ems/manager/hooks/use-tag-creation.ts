"use client";

import axios from "axios";
import { useState } from "react";
import type { Tag } from "./use-tags";

export interface UseTagCreationParams {
  existingTags: Tag[];
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
