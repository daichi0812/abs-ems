import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMyReserves } from "./use-my-reserves";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useMyReserves", () => {
  it("starts with empty filteredData and idToNameMap", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));
    expect(result.current.filteredData).toEqual([]);
    expect(result.current.idToNameMap).toEqual({});
  });

  it("builds idToNameMap from /api/lists and filters /api/reserves by userId", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        { id: 1, name: "Camera", detail: "", image: "", usable: true },
        { id: 2, name: "Tripod", detail: "", image: "", usable: true },
      ],
    });
    // サーバーが user_id=u1 で絞り込み済みのデータを返す想定（u2 は含めない）
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        { id: 100, user_id: "u1", start: new Date(), end: new Date(), list_id: 1, isRenting: 0 },
      ],
    });

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));

    await waitFor(() => expect(result.current.filteredData).toHaveLength(1));

    expect(result.current.idToNameMap).toEqual({ 1: "Camera", 2: "Tripod" });
    expect(result.current.filteredData[0].user_id).toBe("u1");
    expect(result.current.filteredData[0].id).toBe(100);
    // 絞り込みがサーバー側 ?user_id= で行われることを保証する（スコープ担保）
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1");
  });

  it("returns empty filteredData when no reserves match userId", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // /api/lists
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // /api/reserves?user_id=u1 (サーバーが0件)

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(result.current.filteredData).toEqual([]);
  });

  it("refetch re-runs both fetches", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    fetchMock.mockClear();
    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("/api/lists");
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1");
  });
});
