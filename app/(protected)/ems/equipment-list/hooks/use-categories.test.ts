import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCategories } from "./use-categories";

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

describe("useCategories", () => {
  it("starts with empty categories and isLoading=true", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useCategories());
    expect(result.current.categories).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches /api/tags on mount and stores result", async () => {
    fetchMock.mockResolvedValue({
      json: async () => [
        { id: "1", name: "Audio", color: "#ff0000" },
        { id: "2", name: "Video", color: "#00ff00" },
      ],
    });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
    expect(result.current.categories).toHaveLength(2);
    expect(result.current.categories[0].name).toBe("Audio");
  });

  it("handles fetch errors gracefully and clears loading", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.categories).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
