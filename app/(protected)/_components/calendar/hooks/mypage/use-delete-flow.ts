"use client";

import axios from "axios";
import { useState } from "react";
import type { MypageCalendarEvent, Reserve } from "./use-calendar-events";

export interface UseDeleteFlowParams {
  filteredData: Reserve[];
  allEvents: MypageCalendarEvent[];
  setAllEvents: (events: MypageCalendarEvent[]) => void;
  refetchReserves: () => Promise<void>;
}

export const useDeleteFlow = ({
  filteredData,
  allEvents,
  setAllEvents,
  refetchReserves,
}: UseDeleteFlowParams) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const openDelete = (data: { event: { id: string } }) => {
    setShowDeleteModal(true);
    setIdToDelete(Number(data.event.id));
  };

  const closeDelete = () => {
    setShowDeleteModal(false);
    setIdToDelete(null);
  };

  const deleteSelected = async () => {
    const eventToDelete = filteredData.find(
      (event) => Number(event.id) === Number(idToDelete),
    );

    if (
      eventToDelete &&
      (eventToDelete.isRenting === 2 ||
        eventToDelete.isRenting === 3 ||
        eventToDelete.isRenting === 4)
    ) {
      if (eventToDelete.isRenting === 2) {
        window.alert("現在借りている機材は削除できません。");
      } else if (eventToDelete.isRenting === 3) {
        window.alert("現在借りている機材は削除できません。");
      } else {
        window.alert("過去の記録は消すことができません。");
      }
      setShowDeleteModal(false);
      setIdToDelete(null);
      return;
    }

    try {
      await axios.delete(`/api/reserves/${Number(idToDelete)}`);
    } catch (error) {
      console.error("Error deleting reserve:", error);
      window.alert("予約の削除に失敗しました。");
      setShowDeleteModal(false);
      setIdToDelete(null);
      return;
    }

    await refetchReserves();

    setAllEvents(allEvents.filter((event) => Number(event.id) !== Number(idToDelete)));
    setShowDeleteModal(false);
    setIdToDelete(null);
  };

  return {
    showDeleteModal,
    setShowDeleteModal,
    idToDelete,
    openDelete,
    closeDelete,
    deleteSelected,
  };
};
