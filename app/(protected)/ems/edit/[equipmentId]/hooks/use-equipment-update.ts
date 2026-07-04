"use client";

import axios from "axios";
import type { PutBlobResult } from "@vercel/blob";
import { useRef, useState } from "react";
import { useGetImageUrl } from "@/app/(protected)/ems/manager/useGetImageUrl";
import { managerAuthHeaders } from "@/lib/manager-auth";
import type { Tag as Tags } from "@/types/domain";

export interface UseEquipmentUpdateParams {
  equipmentId: string | string[] | undefined;
  equipmentName: string;
  equipmentDetail: string;
  currentImageUrl: string;
  selectedTagName: string;
  tags: Tags[];
  onSuccess: () => void; // typically router.push('/ems/manager')
}

export const useEquipmentUpdate = ({
  equipmentId,
  equipmentName,
  equipmentDetail,
  currentImageUrl,
  selectedTagName,
  tags,
  onSuccess,
}: UseEquipmentUpdateParams) => {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { imageUrl } = useGetImageUrl({ file: imageFile });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget?.files && e.currentTarget.files[0]) {
      setImageFile(e.currentTarget.files[0]);
    }
  };

  const submit = async () => {
    try {
      let blobUrl = currentImageUrl;

      if (imageFile) {
        try {
          const responseVercel = await fetch(`/api/upload?filename=${imageFile.name}`, {
            method: "POST",
            body: imageFile,
          });
          const responseText = await responseVercel.text();
          console.log("Image upload response:", responseText);

          const blob = JSON.parse(responseText) as PutBlobResult;
          blobUrl = blob.url;
        } catch (error) {
          console.error("Image upload failed:", error);
          alert("画像のアップロードに失敗しました");
          return;
        }
      }

      try {
        const response = await axios.put(
          `/api/lists/${equipmentId}`,
          {
            name: equipmentName,
            detail: equipmentDetail,
            image: blobUrl,
            tag_id: tags.find((tag) => tag.name === selectedTagName)?.id,
          },
          {
            headers: { "Content-Type": "application/json", ...managerAuthHeaders() },
          },
        );
        console.log("Update response:", response.data);
        alert("機材情報が更新されました");
        onSuccess();
      } catch (error) {
        console.error("Failed to update equipment:", error);
        if (axios.isAxiosError(error)) {
          console.error("Response data:", error.response?.data);
        }
        alert("機材情報の更新に失敗しました");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("予期せぬエラーが発生しました");
    }
  };

  return {
    inputFileRef,
    imageFile,
    imageUrl,
    onFileChange,
    submit,
  };
};
