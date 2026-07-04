"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { managerAuthHeaders } from "@/lib/manager-auth";

export interface UseTagEditingParams {
  refetchTags: () => Promise<void>;
}

export const useTagEditing = ({ refetchTags }: UseTagEditingParams) => {
  const [editTagId, setEditTagId] = useState<number | null>(null);
  const [editTagName, setEditTagName] = useState<string>("");
  const [editTagColor, setEditTagColor] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editTagId !== null) {
      inputRef.current?.focus();
    }
  }, [editTagId]);

  const startEdit = (id: number, name: string, color: string) => {
    setEditTagId(id);
    setEditTagName(name);
    setEditTagColor(color);
  };

  const cancelEdit = () => {
    setEditTagId(null);
  };

  const saveEdit = async (id: number) => {
    if (!editTagName.trim()) {
      alert("カテゴリ名を入力してください.");
      return;
    }
    try {
      await axios.put(
        `/api/tags/${id}`,
        {
          name: editTagName,
          color: editTagColor,
        },
        { headers: managerAuthHeaders() },
      );
      alert("カテゴリが更新されました.");
      setEditTagId(null);
      await refetchTags();
    } catch (err) {
      console.error("カテゴリの更新に失敗しました.", err);
      alert("カテゴリの更新に失敗しました.");
    }
  };

  return {
    editTagId,
    editTagName,
    setEditTagName,
    editTagColor,
    setEditTagColor,
    inputRef,
    startEdit,
    cancelEdit,
    saveEdit,
  };
};
