"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export interface UseEquipmentActionsParams {
  refetchEquipments: () => Promise<void>;
}

export const useEquipmentActions = ({ refetchEquipments }: UseEquipmentActionsParams) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const editEquipment = (equipmentId: number) => {
    setLoadingId(equipmentId);
    startTransition(() => {
      router.push(`/ems/edit/${equipmentId}`);
    });
  };

  const deleteEquipment = async (equipmentId: number) => {
    const confirmed = window.confirm("本当に削除しますか？");
    if (confirmed) {
      const res = await fetch(`/api/lists/${equipmentId}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("機材の削除に失敗しました。");
        return;
      }
      await refetchEquipments();
    }
  };

  return { loadingId, isPending, editEquipment, deleteEquipment };
};
