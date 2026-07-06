"use client";

import axios from "axios";
import { useRef, useState } from "react";
import { toast } from "sonner";
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

  const submit = async (): Promise<boolean> => {
    try {
      let blobUrl = currentImageUrl;

      if (imageFile) {
        try {
          const responseVercel = await fetch(`/api/upload?filename=${imageFile.name}`, {
            method: "POST",
            body: imageFile,
            headers: managerAuthHeaders(),
          });
          const responseText = await responseVercel.text();

          // fetch は HTTP エラーでは throw せず、API のエラー応答 {error:...} も有効な JSON の
          // ため、ok チェックなしでは catch に入らず「古い画像のまま更新しました」になっていた。
          if (!responseVercel.ok) {
            throw new Error(`画像アップロードに失敗: ${responseVercel.status} ${responseText}`);
          }

          // アップロード API（R2）の応答は { url } のみ（旧 Vercel Blob の PutBlobResult 依存を除去）
          const blob = JSON.parse(responseText) as { url: string };
          blobUrl = blob.url;
        } catch (error) {
          console.error("Image upload failed:", error);
          toast.error("画像のアップロードに失敗しました");
          return false;
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
        toast.success("機材情報を更新しました");
        onSuccess();
        return true;
      } catch (error) {
        console.error("Failed to update equipment:", error);
        if (axios.isAxiosError(error)) {
          console.error("Response data:", error.response?.data);
        }
        toast.error("機材情報の更新に失敗しました");
        return false;
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("予期せぬエラーが発生しました");
      return false;
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
