import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTagsList } from "./use-tags-list";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useTagsList", () => {
  it("starts with empty tags", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useTagsList());
    expect(result.current.tags).toEqual([]);
  });

  it("fetches /api/tags on mount", async () => {
    const data = [
      { id: 1, name: "Audio", color: "#ff0000" },
      { id: 2, name: "Video", color: "#00ff00" },
    ];
    fetchMock.mockResolvedValue({ json: async () => data });

    const { result } = renderHook(() => useTagsList());

    await waitFor(() => expect(result.current.tags).toEqual(data));

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useTagsList());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
