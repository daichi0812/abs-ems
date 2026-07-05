"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";
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
  const [selectedTag, setSelectedTag] = useState("all");

  const cancel = () => {
    resetImage();
    setEquipmentName("");
    setEquipmentDetail("");
    setSelectedTag("");
  };

  const submit = async (): Promise<boolean> => {
    try {
      // アップロード API（R2）の応答は { url } のみ（旧 Vercel Blob の PutBlobResult 依存を除去）
      let blob: { url: string } | null = null;

      if (inputFileRef.current?.files && inputFileRef.current.files.length > 0) {
        const file = inputFileRef.current.files[0];
        const responseVercel = await fetch(`/api/upload?filename=${file.name}`, {
          method: "POST",
          body: file,
          headers: managerAuthHeaders(),
        });
        blob = (await responseVercel.json()) as { url: string };
      }

      await axios.post(
        "/api/lists",
        {
          name: equipmentName,
          detail: equipmentDetail,
          image: blob?.url || "",
          tag_id: tags.find((tag) => tag.name === selectedTag)?.id,
        },
        { headers: managerAuthHeaders() },
      );
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
