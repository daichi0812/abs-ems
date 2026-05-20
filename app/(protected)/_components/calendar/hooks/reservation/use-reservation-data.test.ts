import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReservationData } from "./use-reservation-data";

const fetchMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  consoleErrorSpy.mockClear();
});

describe("useReservationData", () => {
  it("starts with empty state and isFetching=true", () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useReservationData({ listId: 1 }));
    expect(result.current.allEvents).toEqual([]);
    expect(result.current.filteredData).toEqual([]);
    expect(result.current.isFetching).toBe(true);
  });

  it("fetches users + reserves, filters by listId, and builds events", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: "u1", name: "Taro" },
        { id: "u2", name: "Hanako" },
      ],
    });
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        { id: 1, user_id: "u1", start: "2026-01-01", end: "2026-01-03", list_id: 10 },
        { id: 2, user_id: "u2", start: "2026-02-01", end: "2026-02-02", list_id: 99 }, // different list
      ],
    });

    const { result } = renderHook(() => useReservationData({ listId: 10 }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].id).toBe(1);
    expect(result.current.allEvents).toHaveLength(1);
    expect(result.current.allEvents[0].title).toBe("Taro");
    // end date should be Jan 4 (Jan 3 + 1)
    expect((result.current.allEvents[0].end as Date).getDate()).toBe(4);
  });

  it("logs and bails out when users fetch fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    renderHook(() => useReservationData({ listId: 10 }));

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
  });

  it("refetch re-runs the fetch sequence", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useReservationData({ listId: 1 }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fetchMock.mockClear();
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalled();
  });
});
