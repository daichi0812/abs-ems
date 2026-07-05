import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { delete: vi.fn() },
}));

import axios from "axios";
import { useDeleteFlow } from "./use-delete-flow";
import type { MypageCalendarEvent, Reserve } from "./use-calendar-events";

const makeReserve = (partial: Partial<Reserve>): Reserve => ({
  id: 1,
  user_id: "u1",
  start: new Date("2026-01-01"),
  end: new Date("2026-01-05"),
  list_id: 10,
  isRenting: 0,
  ...partial,
});

const makeEvent = (partial: Partial<MypageCalendarEvent>): MypageCalendarEvent => ({
  title: "Camera",
  start: "2026-01-01",
  end: "2026-01-02",
  allDay: true,
  id: 1,
  ...partial,
});

const alertMock = vi.fn();
const refetchReserves = vi.fn(async () => {});
const setAllEvents = vi.fn();

beforeEach(() => {
  vi.mocked(axios.delete).mockReset();
  alertMock.mockReset();
  refetchReserves.mockClear();
  setAllEvents.mockClear();
  vi.stubGlobal("alert", alertMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const defaultParams = (overrides?: {
  filteredData?: Reserve[];
  allEvents?: MypageCalendarEvent[];
}) => ({
  filteredData: overrides?.filteredData ?? [makeReserve({ id: 1 })],
  allEvents: overrides?.allEvents ?? [makeEvent({ id: 1 })],
  setAllEvents,
  refetchReserves,
});

describe("useDeleteFlow - open/close", () => {
  it("openDelete sets showDeleteModal=true and idToDelete from event", () => {
    const { result } = renderHook(() => useDeleteFlow(defaultParams()));

    act(() => {
      result.current.openDelete({ event: { id: "5" } });
    });

    expect(result.current.showDeleteModal).toBe(true);
    expect(result.current.idToDelete).toBe(5);
  });

  it("closeDelete resets state", () => {
    const { result } = renderHook(() => useDeleteFlow(defaultParams()));

    act(() => {
      result.current.openDelete({ event: { id: "5" } });
    });
    act(() => {
      result.current.closeDelete();
    });

    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.idToDelete).toBeNull();
  });
});

describe("useDeleteFlow - deleteSelected validation", () => {
  it("alerts and skips DELETE when isRenting=2 (currently rented)", async () => {
    const { result } = renderHook(() =>
      useDeleteFlow(
        defaultParams({ filteredData: [makeReserve({ id: 1, isRenting: 2 })] }),
      ),
    );

    act(() => {
      result.current.openDelete({ event: { id: "1" } });
    });

    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(alertMock).toHaveBeenCalledWith("現在借りている機材は削除できません。");
    expect(axios.delete).not.toHaveBeenCalled();
    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.idToDelete).toBeNull();
  });

  it("alerts and skips DELETE when isRenting=3", async () => {
    const { result } = renderHook(() =>
      useDeleteFlow(
        defaultParams({ filteredData: [makeReserve({ id: 1, isRenting: 3 })] }),
      ),
    );

    act(() => {
      result.current.openDelete({ event: { id: "1" } });
    });

    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(alertMock).toHaveBeenCalledWith("現在借りている機材は削除できません。");
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it("alerts about historical record when isRenting=4", async () => {
    const { result } = renderHook(() =>
      useDeleteFlow(
        defaultParams({ filteredData: [makeReserve({ id: 1, isRenting: 4 })] }),
      ),
    );

    act(() => {
      result.current.openDelete({ event: { id: "1" } });
    });

    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(alertMock).toHaveBeenCalledWith("過去の記録は消すことができません。");
    expect(axios.delete).not.toHaveBeenCalled();
  });
});

describe("useDeleteFlow - deleteSelected success", () => {
  it("calls axios.delete, refetches parent, removes event, and closes modal", async () => {
    vi.mocked(axios.delete).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() =>
      useDeleteFlow(
        defaultParams({
          filteredData: [makeReserve({ id: 1, isRenting: 0 })],
          allEvents: [makeEvent({ id: 1 }), makeEvent({ id: 2 })],
        }),
      ),
    );

    act(() => {
      result.current.openDelete({ event: { id: "1" } });
    });

    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(axios.delete).toHaveBeenCalledWith("/api/reserves/1");
    expect(refetchReserves).toHaveBeenCalledOnce();
    expect(setAllEvents).toHaveBeenCalledWith([
      expect.objectContaining({ id: 2 }),
    ]);

    await waitFor(() => expect(result.current.showDeleteModal).toBe(false));
    expect(result.current.idToDelete).toBeNull();
  });
});

describe("useDeleteFlow - deleteSelected failure", () => {
  it("alerts, keeps events intact, and closes modal when the DELETE fails", async () => {
    vi.mocked(axios.delete).mockRejectedValue(new Error("forbidden"));

    const { result } = renderHook(() =>
      useDeleteFlow(
        defaultParams({
          filteredData: [makeReserve({ id: 1, isRenting: 0 })],
          allEvents: [makeEvent({ id: 1 })],
        }),
      ),
    );

    act(() => {
      result.current.openDelete({ event: { id: "1" } });
    });

    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(alertMock).toHaveBeenCalledWith("予約の削除に失敗しました。");
    // 失敗時はローカルのイベントを消さない
    expect(setAllEvents).not.toHaveBeenCalled();
    expect(refetchReserves).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.showDeleteModal).toBe(false));
  });
});
