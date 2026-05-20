"use client";

import axios from "axios";
import moment from "moment-timezone";
import { useEffect, useState } from "react";
import type { DropArg } from "@fullcalendar/interaction";
import type { ReservationEvent, Reserve } from "./use-reservation-data";

const makeEmptyEvent = (userId: string | undefined): ReservationEvent => ({
  title: userId,
  start: "",
  end: "",
  allDay: true,
  id: 0,
});

export const isOverlapping = (
  newEvent: ReservationEvent,
  filteredData: Reserve[],
): boolean => {
  const newEventStart = new Date(newEvent.start).getTime();
  const newEventEnd = new Date(newEvent.end).getTime();

  return filteredData.some((event) => {
    const existingEventStart = new Date(event.start).getTime();
    const existingEventEnd = new Date(event.end).getTime();

    return (
      (newEventStart >= existingEventStart && newEventStart <= existingEventEnd) ||
      (newEventEnd >= existingEventStart && newEventEnd <= existingEventEnd) ||
      (newEventStart <= existingEventStart && newEventEnd >= existingEventEnd)
    );
  });
};

export interface UseReservationFormParams {
  userId: string | undefined;
  listId: number;
  filteredData: Reserve[];
  allEvents: ReservationEvent[];
  setAllEvents: (events: ReservationEvent[] | ((prev: ReservationEvent[]) => ReservationEvent[])) => void;
  refetchReserves: () => Promise<void>;
}

export const useReservationForm = ({
  userId,
  listId,
  filteredData,
  allEvents,
  setAllEvents,
  refetchReserves,
}: UseReservationFormParams) => {
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState<ReservationEvent>(() => makeEmptyEvent(userId));

  useEffect(() => {
    setNewEvent({
      title: userId,
      start: "",
      end: "",
      allDay: false,
      id: 0,
    });
  }, [userId]);

  const handleDateClick = (arg: { date: Date; allDay: boolean }) => {
    setNewEvent({
      ...newEvent,
      start: arg.date,
      allDay: arg.allDay,
      id: new Date().getTime(),
    });
    setShowModal(true);
  };

  const addEvent = (data: DropArg) => {
    const event = {
      ...newEvent,
      start: data.date.toISOString(),
      title: data.draggedEl.innerText,
      allDay: data.allDay,
      id: new Date().getTime(),
    };
    setAllEvents([...allEvents, event]);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewEvent(makeEmptyEvent(userId));
  };

  const updateStart = (value: string) => {
    setNewEvent({ ...newEvent, start: value });
  };
  const updateEnd = (value: string) => {
    setNewEvent({ ...newEvent, end: value });
  };

  const postReservesData = async () => {
    const startDate = new Date(newEvent.start);
    startDate.setDate(startDate.getDate() + 1);

    const response = await axios.post("/api/reserves", {
      user_id: userId,
      start: startDate,
      end: newEvent.end,
      list_id: listId,
    });
    console.log(response);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newEvent.start === "" || newEvent.end === "") {
      window.alert("日付を選択してください。");
      return;
    }

    const hasOverlap = isOverlapping(newEvent, filteredData);

    if (hasOverlap) {
      window.alert("この期間にはすでに予約が入っています。別の期間を選択してください。");
      setShowModal(false);
      return;
    }

    const today = moment().tz("Asia/Tokyo").format("YYYY-MM-DD");
    const start = moment(newEvent.start).tz("Asia/Tokyo").format("YYYY-MM-DD");
    const end = moment(newEvent.end).tz("Asia/Tokyo").format("YYYY-MM-DD");

    if (start < today || end < today || end < start) {
      window.alert("無効な予約日です。");
      setShowModal(false);
      return;
    }

    setAllEvents((prevEvents) => [...prevEvents, newEvent]);
    await postReservesData();

    setNewEvent({
      title: userId,
      start: "",
      end: "",
      allDay: true,
      id: 0,
    });

    window.alert("予約が正常に完了しました。");
    await refetchReserves();
    setShowModal(false);
  };

  return {
    newEvent,
    setNewEvent,
    showModal,
    setShowModal,
    handleDateClick,
    addEvent,
    closeModal,
    updateStart,
    updateEnd,
    submit,
  };
};
