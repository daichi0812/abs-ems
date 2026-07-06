"use client";

import { useState } from "react";
import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { compressImage } from "@/lib/image-compress";
import type { Tag } from "./use-tags";

export interface UseEquipmentRegistrationParams {
  tags: Tag[];
  inputFileRef: React.RefObject<HTMLInputElement | null>;
  resetImage: () => void;
  refetchEquipments: () => Promise<void>;
}

export const useEquipmentRegistration = ({
  tags,
  inputFileRef,
  resetImage,
  refetchEquipments,
}: UseEquipmentRegistrationParams) => {
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentDetail, setEquipmentDetail] = useState("");
  // 初期値を "all" にしていた頃は、カテゴリ未選択でも canSubmit（selectedTag !== ""）を
  // 素通りして tag_id: undefined の「未分類」機材が登録され、予約画面から消えていた。
  const [selectedTag, setSelectedTag] = useState("");

  const cancel = () => {
    resetImage();
    setEquipmentName("");
    setEquipmentDetail("");
    setSelectedTag("");
  };

  const submit = async (): Promise<boolean> => {
    try {
      // tag_id 無しで登録すると機材が部員の予約画面に表示されなくなるため、
      // 実在するカテゴリが選ばれていることを送信時にも保証する。
      const tagId = tags.find((tag) => tag.name === selectedTag)?.id;
      if (tagId == null) {
        toast.error("カテゴリを選択してください");
        return false;
      }

      // アップロード API（R2）の応答は { url } のみ（旧 Vercel Blob の PutBlobResult 依存を除去）
      let blob: { url: string } | null = null;

      if (inputFileRef.current?.files && inputFileRef.current.files.length > 0) {
        // スマホ写真の原寸（数MB）をそのまま置くと全部員がサムネイル表示のために
        // 原寸を落とすことになるため、アップロード前に縮小する（失敗時は原本のまま）
        const file = await compressImage(inputFileRef.current.files[0]);
        const responseVercel = await fetch(`/api/upload?filename=${file.name}`, {
          method: "POST",
          body: file,
          headers: managerAuthHeaders(),
        });
        // fetch は HTTP エラーでは throw しない。API のエラー応答 {error:...} も有効な JSON の
        // ため、ここで止めないと写真なしの機材が「登録完了」と表示されてしまう。
        if (!responseVercel.ok) {
          toast.error("画像のアップロードに失敗しました。機材は登録されていません。");
          return false;
        }
        blob = (await responseVercel.json()) as { url: string };
      }

      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...managerAuthHeaders() },
        body: JSON.stringify({
          name: equipmentName,
          detail: equipmentDetail,
          image: blob?.url || "",
          tag_id: tagId,
        }),
      });
      // fetch は HTTP エラーで throw しないため、明示的に catch へ流す
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("機材登録が完了しました");
      setSelectedTag("");
      await refetchEquipments();
      cancel();
      return true;
    } catch (err) {
      toast.error("機材登録ができません");
      return false;
    }
  };

  return {
    equipmentName,
    setEquipmentName,
    equipmentDetail,
    setEquipmentDetail,
    selectedTag,
    setSelectedTag,
    submit,
    cancel,
  };
};
