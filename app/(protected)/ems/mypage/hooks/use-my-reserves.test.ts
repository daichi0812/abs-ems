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
  it("starts with empty filteredData and isLoading=true", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));
    expect(result.current.filteredData).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches only /api/reserves filtered by userId (no /api/lists duplication)", async () => {
    // サーバーが user_id=u1 で絞り込み済みのデータを返す想定（u2 は含めない）
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        { id: 100, user_id: "u1", start: new Date(), end: new Date(), list_id: 1, isRenting: 0 },
      ],
    });

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));

    await waitFor(() => expect(result.current.filteredData).toHaveLength(1));

    expect(result.current.filteredData[0].user_id).toBe("u1");
    expect(result.current.filteredData[0].id).toBe(100);
    expect(result.current.isLoading).toBe(false);
    // 絞り込みがサーバー側 ?user_id= で行われることを保証する（スコープ担保）
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1");
    // 機材名の解決は useEquipments 側の責務。/api/lists の二重取得はしない
    expect(fetchMock).not.toHaveBeenCalledWith("/api/lists");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty filteredData when no reserves match userId", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // サーバーが0件

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filteredData).toEqual([]);
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fetchMock.mockClear();
    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1");
  });

  it("refetches when userId becomes available after mount", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { rerender } = renderHook(({ userId }) => useMyReserves({ userId }), {
      initialProps: { userId: undefined as string | undefined },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id="));

    rerender({ userId: "u1" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1"));
  });

  it("sends an empty ?user_id= (server zero-match) when userId is undefined, never a bare /api/reserves", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // /api/reserves?user_id= (サーバーが0件)

    renderHook(() => useMyReserves({ userId: undefined }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    // 全ユーザー予約の漏洩を防ぐため、userId 未確定でも必ず絞り込みクエリを送る
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=");
    expect(fetchMock).not.toHaveBeenCalledWith("/api/reserves");
  });

  it("does not crash and stays empty when the reserves response is not an array (5xx body)", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ error: "boom" }) }); // 非配列

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.filteredData).toEqual([]);
  });

  it("reports isError instead of a silent empty state when the fetch rejects", async () => {
    // 以前は通信エラーで「予約はまだありません。」の誤表示のまま固まっていた（回帰防止）
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useMyReserves({ userId: "u1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.filteredData).toEqual([]);
    consoleErrorSpy.mockRestore();
  });
});
