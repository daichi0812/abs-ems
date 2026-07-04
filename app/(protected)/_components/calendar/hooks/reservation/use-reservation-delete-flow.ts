"use client";

import { useState } from "react";
import type { ReservationEvent } from "./use-reservation-data";

export interface UseReservationDeleteFlowParams {
  allEvents: ReservationEvent[];
  setAllEvents: (events: ReservationEvent[]) => void;
}

export const useReservationDeleteFlow = ({
  allEvents,
  setAllEvents,
}: UseReservationDeleteFlowParams) => {
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

  // NOTE: local-only delete. The delete-confirmation UI is not currently rendered in
  // the parent component, so this function is effectively unreachable from the UI.
  // Preserved verbatim during refactor; the parent still wires eventClick → openDelete.
  const deleteSelected = () => {
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
