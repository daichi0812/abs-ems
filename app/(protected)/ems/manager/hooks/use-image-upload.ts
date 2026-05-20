"use client";

import { useRef, useState } from "react";
import { useGetImageUrl } from "../useGetImageUrl";

export const useImageUpload = () => {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { imageUrl } = useGetImageUrl({ file: imageFile });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget?.files && e.currentTarget.files[0]) {
      setImageFile(e.currentTarget.files[0]);
    }
  };

  const reset = () => {
    setImageFile(null);
    if (inputFileRef.current) {
      inputFileRef.current.value = "";
    }
  };

  return { inputFileRef, imageFile, imageUrl, onFileChange, reset };
};
