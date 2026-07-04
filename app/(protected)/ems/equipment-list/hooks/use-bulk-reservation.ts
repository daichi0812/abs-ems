"use client";

import axios from "axios";
import moment from "moment-timezone";
import { useState } from "react";

import { checkAllOverlaps } from "@/lib/reservation-overlap";
import type { Equipment, Reserve } from "@/types/domain";

export interface BulkForm {
  start: string;
  end: string;
}

export interface UseBulkReservationParams {
  userId: string | undefined;
  equipments: Equipment[];
  reserves: Reserve[];
  refetchReserves: () => Promise<void>;
}

export const useBulkReservation = ({
  userId,
  equipments,
  reserves,
  refetchReserves,
}: UseBulkReservationParams) => {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>({ start: "", end: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleBulkMode = () => {
    setIsBulkMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleEquipment = (equipmentId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(equipmentId);
      } else {
        next.delete(equipmentId);
      }
      return next;
    });
  };

  const openModal = async () => {
    if (selectedIds.size === 0) {
      alert("少なくとも1つの機材を選択してください。");
      return;
    }
    await refetchReserves();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setBulkForm({ start: "", end: "" });
  };

  const updateForm = (partial: Partial<BulkForm>) => {
    setBulkForm((prev) => ({ ...prev, ...partial }));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (bulkForm.start === "" || bulkForm.end === "") {
      alert("開始日と終了日を選択してください。");
      return;
    }

    const today = moment().tz("Asia/Tokyo").format("YYYY-MM-DD");
    const start = moment(bulkForm.start).tz("Asia/Tokyo").format("YYYY-MM-DD");
    const end = moment(bulkForm.end).tz("Asia/Tokyo").format("YYYY-MM-DD");

    if (start < today || end < today || end < start) {
      alert("無効な予約日です。開始日は今日以降、終了日は開始日以降を選択してください。");
      return;
    }

    const { hasOverlap, conflictingEquipments } = checkAllOverlaps(
      reserves,
      equipments,
      selectedIds,
      bulkForm.start,
      bulkForm.end,
    );

    if (hasOverlap) {
      alert(
        `以下の機材は選択した期間に既に予約が入っています：\n${conflictingEquipments.join("\n")}\n\n別の期間を選択してください。`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const ids = Array.from(selectedIds);
      const promises = ids.map((listId) =>
        axios.post("/api/reserves", {
          user_id: userId,
          start: bulkForm.start,
          end: bulkForm.end,
          list_id: listId,
        }),
      );

      await Promise.all(promises);

      alert(`${ids.length}件の予約が正常に完了しました。`);

      setShowModal(false);
      setBulkForm({ start: "", end: "" });
      setSelectedIds(new Set());
      setIsBulkMode(false);
    } catch (error) {
      console.error("Error creating bulk reservations:", error);
      alert("予約の作成中にエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isBulkMode,
    selectedIds,
    bulkForm,
    showModal,
    isSubmitting,
    toggleBulkMode,
    toggleEquipment,
    openModal,
    closeModal,
    updateForm,
    submit,
  };
};
