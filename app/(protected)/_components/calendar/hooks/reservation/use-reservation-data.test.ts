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
    // サーバーが list_id=10 で絞り込み済みのデータを返す想定（list_id 99 は含めない）
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        { id: 1, user_id: "u1", start: "2026-01-01", end: "2026-01-03", list_id: 10 },
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
    // 絞り込みがサーバー側 ?list_id= で行われることを保証する（スコープ担保）
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?list_id=10");
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

  it("bails out safely (empty, no crash, no fetch) when listId is not a valid integer", async () => {
    // 不正な equipmentId 経由で listId が NaN のケース。従来は空カレンダー、
    // サーバーフィルタ導入後もクラッシュせず空で終えることを保証する。
    const { result } = renderHook(() => useReservationData({ listId: Number("abc") }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.filteredData).toEqual([]);
    expect(result.current.allEvents).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not crash and stays empty when the reserves response is not an array (5xx body)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [{ id: "u1", name: "Taro" }] }); // users
    fetchMock.mockResolvedValueOnce({ json: async () => ({ error: "boom" }) }); // reserves 非配列

    const { result } = renderHook(() => useReservationData({ listId: 10 }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.filteredData).toEqual([]);
    expect(result.current.allEvents).toEqual([]);
  });
});
