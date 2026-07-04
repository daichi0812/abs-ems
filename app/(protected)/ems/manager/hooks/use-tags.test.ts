import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTags } from "./use-tags";

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

describe("useTags", () => {
  it("starts with empty tags and isLoading=true", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useTags());
    expect(result.current.tags).toEqual([]);
    expect(result.current.categories).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("populates both tags and categories from /api/tags on mount", async () => {
    const data = [
      { id: "1", name: "Audio", color: "#ff0000" },
      { id: "2", name: "Video", color: "#00ff00" },
    ];
    fetchMock.mockResolvedValue({ json: async () => data });

    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
    expect(result.current.tags).toEqual(data);
    expect(result.current.categories).toEqual(data);
  });

  it("clears isLoading and logs when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.tags).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useTags());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMock.mockClear();
    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
  });
});
