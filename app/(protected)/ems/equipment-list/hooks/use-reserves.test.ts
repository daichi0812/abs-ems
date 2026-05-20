import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReserves } from "./use-reserves";

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

describe("useReserves", () => {
  it("starts with empty reserves", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useReserves());
    expect(result.current.reserves).toEqual([]);
  });

  it("fetches /api/reserves on mount and stores result", async () => {
    const data = [
      { id: 1, user_id: "u1", start: "2026-01-01", end: "2026-01-02", list_id: 1 },
    ];
    fetchMock.mockResolvedValue({ json: async () => data });

    const { result } = renderHook(() => useReserves());

    await waitFor(() => expect(result.current.reserves).toHaveLength(1));

    expect(fetchMock).toHaveBeenCalledWith("/api/reserves");
    expect(result.current.reserves).toEqual(data);
  });

  it("logs and continues when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useReserves());

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

    expect(result.current.reserves).toEqual([]);
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useReserves());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
