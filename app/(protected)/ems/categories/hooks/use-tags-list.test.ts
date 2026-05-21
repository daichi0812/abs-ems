import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

import axios from "axios";
import { useTagsList } from "./use-tags-list";

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.get).mockReset();
});

afterEach(() => {
  consoleErrorSpy.mockClear();
});

describe("useTagsList", () => {
  it("starts with empty tags and isLoading=true", () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] } as never);
    const { result } = renderHook(() => useTagsList());
    expect(result.current.tags).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches /api/tags and sorts by id ascending", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        { id: 3, name: "C", color: "#3" },
        { id: 1, name: "A", color: "#1" },
        { id: 2, name: "B", color: "#2" },
      ],
    } as never);

    const { result } = renderHook(() => useTagsList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tags.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(axios.get).toHaveBeenCalledWith("/api/tags");
  });

  it("logs error and clears isLoading on failure", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useTagsList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.tags).toEqual([]);
  });

  it("refetch re-runs the GET", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] } as never);

    const { result } = renderHook(() => useTagsList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(axios.get).mockClear();
    await result.current.refetch();

    expect(axios.get).toHaveBeenCalledWith("/api/tags");
  });
});
