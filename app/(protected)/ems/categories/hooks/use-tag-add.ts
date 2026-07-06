"use client";

import { useState } from "react";
import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { CATEGORY_PALETTE } from "@/lib/category-colors";

interface TagLike {
  name: string;
}

export interface UseTagAddParams {
  existingTags: readonly TagLike[];
  refetchTags: () => Promise<void>;
}

// カテゴリ新規追加。固定パレットから色を選び、名前と合わせて POST（sortOrder は API 側で末尾採番）。
export const useTagAdd = ({ existingTags, refetchTags }: UseTagAddParams) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_PALETTE[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = name.trim() !== "";

  const submit = async (): Promise<boolean> => {
    const trimmed = name.trim();
    if (trimmed === "") {
      toast.error("カテゴリ名を入力してください");
      return false;
    }
    if (existingTags.some((t) => t.name === trimmed)) {
      toast.error("このカテゴリは既に存在します");
      return false;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...managerAuthHeaders() },
        body: JSON.stringify({ name: trimmed, color }),
      });
      // fetch は HTTP エラーで throw しないため、明示的に catch へ流す
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("カテゴリを追加しました");
      setName("");
      setColor(CATEGORY_PALETTE[0]);
      await refetchTags();
      return true;
    } catch (err) {
      console.error("カテゴリの作成に失敗しました", err);
      toast.error("カテゴリの追加に失敗しました");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    name,
    setName,
    color,
    setColor,
    palette: CATEGORY_PALETTE,
    canSubmit,
    isSubmitting,
    submit,
  };
};
