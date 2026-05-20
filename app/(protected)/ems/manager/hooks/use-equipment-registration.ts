"use client";

import axios from "axios";
import type { PutBlobResult } from "@vercel/blob";
import { useState } from "react";
import type { Tag } from "./use-tags";

export interface UseEquipmentRegistrationParams {
  tags: Tag[];
  inputFileRef: React.RefObject<HTMLInputElement>;
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

  const submit = async () => {
    try {
      let blob: PutBlobResult | null = null;

      if (inputFileRef.current?.files && inputFileRef.current.files.length > 0) {
        const file = inputFileRef.current.files[0];
        const responseVercel = await fetch(`/api/upload?filename=${file.name}`, {
          method: "POST",
          body: file,
        });
        blob = (await responseVercel.json()) as PutBlobResult;
      }

      await axios.post("/api/lists", {
        name: equipmentName,
        detail: equipmentDetail,
        image: blob?.url || "",
        tag_id: tags.find((tag) => tag.name === selectedTag)?.id,
      });
      alert("機材登録が完了しました");
      setSelectedTag("");
      await refetchEquipments();
      cancel();
    } catch (err) {
      alert("機材登録ができません");
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
