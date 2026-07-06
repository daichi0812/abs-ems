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
    expect(toastSuccess).toHaveBeenCalled();
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
});
