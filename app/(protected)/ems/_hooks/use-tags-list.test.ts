import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTagsList } from "./use-tags-list";

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

describe("useTagsList", () => {
  it("starts with empty tags and isLoading=true", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useTagsList());
    expect(result.current.tags).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches /api/tags and stores result without sort by default", async () => {
    const data = [
      { id: 3, name: "C", color: "#3" },
      { id: 1, name: "A", color: "#1" },
      { id: 2, name: "B", color: "#2" },
    ];
    fetchMock.mockResolvedValue({ json: async () => data });

    const { result } = renderHook(() => useTagsList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
    expect(result.current.tags.map((t) => t.id)).toEqual([3, 1, 2]);
  });

  it("sorts by id ascending when sortById=true", async () => {
    const data = [
      { id: 3, name: "C", color: "#3" },
      { id: 1, name: "A", color: "#1" },
      { id: 2, name: "B", color: "#2" },
    ];
    fetchMock.mockResolvedValue({ json: async () => data });

    const { result } = renderHook(() => useTagsList({ sortById: true }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tags.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("logs error and clears isLoading on fetch failure", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useTagsList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.tags).toEqual([]);
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useTagsList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMock.mockClear();
    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
  });
});
