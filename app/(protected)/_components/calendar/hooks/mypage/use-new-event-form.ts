"use client";

import { useState } from "react";
import type { DropArg } from "@fullcalendar/interaction";
import type { MypageCalendarEvent } from "./use-calendar-events";

const emptyEvent: MypageCalendarEvent = {
  title: "",
  start: "",
  end: "",
  allDay: false,
  id: 0,
};

export interface UseNewEventFormParams {
  allEvents: MypageCalendarEvent[];
  setAllEvents: (events: MypageCalendarEvent[]) => void;
}

export const useNewEventForm = ({ allEvents, setAllEvents }: UseNewEventFormParams) => {
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState<MypageCalendarEvent>(emptyEvent);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewEvent({ ...newEvent, title: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAllEvents([...allEvents, newEvent]);
    setShowModal(false);
    setNewEvent(emptyEvent);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewEvent(emptyEvent);
  };

  return {
    newEvent,
    showModal,
    setShowModal,
    handleDateClick,
    addEvent,
    handleChange,
    handleSubmit,
    closeModal,
  };
};
