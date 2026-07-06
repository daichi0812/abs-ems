import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { useReserveActions } from "./use-reserve-actions";

const refetch = vi.fn(async () => {});
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  refetch.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useReserveActions", () => {
  it("borrow: PATCHes isRenting=2, refetches, toasts success, returns true", async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    let ok = false;
    await act(async () => {
      ok = await result.current.borrow(5);
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves/5", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRenting: 2 }),
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith("貸し出しを開始しました");
  });

  it("giveBack: PATCHes isRenting=4", async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    await act(async () => {
      await result.current.giveBack(7);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reserves/7",
      expect.objectContaining({ body: JSON.stringify({ isRenting: 4 }) })
    );
  });

  it("surfaces the API error message and returns false without refetching", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "貸出期間外か、すでに貸出中です。" }),
    } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    let ok = true;
    await act(async () => {
      ok = await result.current.borrow(5);
    });

    expect(ok).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("貸出期間外か、すでに貸出中です。");
  });

  it("cancel: DELETEs, refetches, returns true", async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    let ok = false;
    await act(async () => {
      ok = await result.current.cancel(9);
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves/9", { method: "DELETE" });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("cancel: toasts error and returns false on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useReserveActions({ refetch }));
    let ok = true;
    await act(async () => {
      ok = await result.current.cancel(9);
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith("キャンセルに失敗しました");
  });

  it("borrowMany: PATCHes every id, toasts the count, refetches once", async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    let ok = false;
    await act(async () => {
      ok = await result.current.borrowMany([1, 2, 3]);
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reserves/2",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith("3件の貸し出しを開始しました");
  });

  it("cancelMany: DELETEs every id and toasts the count", async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    await act(async () => {
      await result.current.cancelMany([4, 5]);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(toastSuccess).toHaveBeenCalledWith("2件の予約をキャンセルしました");
  });

  it("giveBackMany: partial failure toasts the fail count, still refetches, returns false", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "貸出中の予約ではありません。" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "貸出中の予約ではありません。" }),
      } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    let ok = true;
    await act(async () => {
      ok = await result.current.giveBackMany([1, 2, 3]);
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith("2件は返却できませんでした");
    expect(refetch).toHaveBeenCalledTimes(1); // 1件は成功しているので一覧は更新する
  });

  it("bulk single failure surfaces the API error message verbatim", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "貸出期間外か、すでに貸出中です。" }),
      } as Response);

    const { result } = renderHook(() => useReserveActions({ refetch }));
    await act(async () => {
      await result.current.borrowMany([1, 2]);
    });

    expect(toastError).toHaveBeenCalledWith("貸出期間外か、すでに貸出中です。");
  });
});
