import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEquipments } from "./use-equipments";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useEquipments", () => {
  it("starts with empty equipments and isLoading=true", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useEquipments());
    expect(result.current.equipments).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches /api/lists on mount and sorts by name", async () => {
    fetchMock.mockResolvedValue({
      json: async () => [
        { id: 1, name: "Tripod", detail: "", image: "", tag_id: "1" },
        { id: 2, name: "Camera", detail: "", image: "", tag_id: "1" },
        { id: 3, name: "Mic", detail: "", image: "", tag_id: "1" },
      ],
    });

    const { result } = renderHook(() => useEquipments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/lists");
    expect(result.current.equipments.map((e) => e.name)).toEqual(["Camera", "Mic", "Tripod"]);
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result } = renderHook(() => useEquipments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMock.mockClear();
    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledWith("/api/lists");
  });
});
