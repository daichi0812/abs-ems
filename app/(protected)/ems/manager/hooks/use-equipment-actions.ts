"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { managerAuthHeaders } from "@/lib/manager-auth";

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

  // 削除確認は UI 側（AlertDialog）で行うため、ここでは確認ダイアログを出さず削除を実行する。
  const deleteEquipment = async (equipmentId: number): Promise<boolean> => {
    const res = await fetch(`/api/lists/${equipmentId}`, {
      method: "DELETE",
      headers: managerAuthHeaders(),
    });
    if (!res.ok) {
      toast.error("機材の削除に失敗しました");
      return false;
    }
    await refetchEquipments();
    toast.success("機材を削除しました");
    return true;
  };

  return { loadingId, isPending, editEquipment, deleteEquipment };
};
