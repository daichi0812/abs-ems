import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReservationDeleteFlow } from "./use-reservation-delete-flow";
import type { ReservationEvent } from "./use-reservation-data";

const makeEvent = (partial: Partial<ReservationEvent>): ReservationEvent => ({
  title: "user",
  start: "2026-01-01",
  end: "2026-01-02",
  allDay: true,
  id: 1,
  ...partial,
});

describe("useReservationDeleteFlow", () => {
  it("starts with closed modal and null idToDelete", () => {
    const { result } = renderHook(() =>
      useReservationDeleteFlow({ allEvents: [], setAllEvents: vi.fn() }),
    );
    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.idToDelete).toBeNull();
  });

  it("openDelete sets showDeleteModal and idToDelete", () => {
    const { result } = renderHook(() =>
      useReservationDeleteFlow({ allEvents: [], setAllEvents: vi.fn() }),
    );

    act(() => {
      result.current.openDelete({ event: { id: "42" } });
    });

    expect(result.current.showDeleteModal).toBe(true);
    expect(result.current.idToDelete).toBe(42);
  });

  it("closeDelete resets state", () => {
    const { result } = renderHook(() =>
      useReservationDeleteFlow({ allEvents: [], setAllEvents: vi.fn() }),
    );

    act(() => {
      result.current.openDelete({ event: { id: "42" } });
    });
    act(() => {
      result.current.closeDelete();
    });

    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.idToDelete).toBeNull();
  });

  it("deleteSelected removes the matching event from allEvents", () => {
    const setAllEvents = vi.fn();
    const events = [makeEvent({ id: 1 }), makeEvent({ id: 2 }), makeEvent({ id: 3 })];

    const { result } = renderHook(() =>
      useReservationDeleteFlow({ allEvents: events, setAllEvents }),
    );

    act(() => {
      result.current.openDelete({ event: { id: "2" } });
    });
    act(() => {
      result.current.deleteSelected();
    });

    expect(setAllEvents).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 3 }),
    ]);
    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.idToDelete).toBeNull();
  });
});
