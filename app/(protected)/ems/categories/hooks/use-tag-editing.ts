"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiMutate } from "@/lib/api-mutate";

export interface UseTagEditingParams {
  refetchTags: () => Promise<void>;
  /** 重複名チェック用の既存カテゴリ一覧（自分自身は除外して判定する） */
  existingTags?: { id: number; name: string }[];
}

export const useTagEditing = ({ refetchTags, existingTags = [] }: UseTagEditingParams) => {
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

  const saveEdit = async (id: number): Promise<boolean> => {
    const trimmed = editTagName.trim();
    if (!trimmed) {
      toast.error("カテゴリ名を入力してください");
      return false;
    }
    // 同名カテゴリを許すと、機材フォームのチップ選択（名前一致判定）が2つ同時に
    // 点灯し、保存時は並び順で先のカテゴリへ黙って付け替わる（追加側と同じチェック）
    if (existingTags.some((t) => t.name === trimmed && t.id !== id)) {
      toast.error("同じ名前のカテゴリがすでにあります");
      return false;
    }
    try {
      await apiMutate(`/api/tags/${id}`, {
        method: "PUT",
        body: { name: trimmed, color: editTagColor },
      });
      toast.success("カテゴリを更新しました");
      setEditTagId(null);
      await refetchTags();
      return true;
    } catch (err) {
      console.error("カテゴリの更新に失敗しました.", err);
      toast.error("カテゴリの更新に失敗しました");
      return false;
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
