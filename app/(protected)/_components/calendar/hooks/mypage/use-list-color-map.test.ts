import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useListColorMap } from "./use-list-color-map";

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

describe("useListColorMap", () => {
  it("starts with an empty map", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useListColorMap());
    expect(result.current.listColorMap).toEqual({});
  });

  it("fetches /api/lists and maps listId → tag color", async () => {
    fetchMock.mockResolvedValue({
      json: async () => [
        { id: 1, name: "Camera", tag: { color: "#ff0000" } },
        { id: 2, name: "Tripod", tag: { color: "#00ff00" } },
      ],
    });

    const { result } = renderHook(() => useListColorMap());

    await waitFor(() =>
      expect(Object.keys(result.current.listColorMap).length).toBeGreaterThan(0),
    );

    expect(result.current.listColorMap).toEqual({
      1: "#ff0000",
      2: "#00ff00",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/lists");
  });

  it("falls back to default color when tag is missing", async () => {
    fetchMock.mockResolvedValue({
      json: async () => [
        { id: 1, name: "Camera", tag: null },
        { id: 2, name: "Tripod" },
      ],
    });

    const { result } = renderHook(() => useListColorMap());

    await waitFor(() => expect(result.current.listColorMap[1]).toBe("#3788D8"));

    expect(result.current.listColorMap).toEqual({
      1: "#3788D8",
      2: "#3788D8",
    });
  });

  it("logs and continues when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    renderHook(() => useListColorMap());

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
  });
});
