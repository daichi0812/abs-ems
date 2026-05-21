"use client";

import { useEffect, useState } from "react";
import type { Tag as Tags } from "@/types/domain";

export const useTagsList = () => {
  const [tags, setTags] = useState<Tags[]>([]);

  const refetch = async () => {
    const response = await fetch("/api/tags");
    const data: Tags[] = await response.json();
    setTags(data);
  };

  useEffect(() => {
    refetch();
  }, []);

  return { tags, refetch };
};
