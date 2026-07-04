import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEquipmentPageData } from "./use-equipment-page-data";

const fetchMock = vi.fn();
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  consoleLogSpy.mockClear();
});

describe("useEquipmentPageData", () => {
  it("starts with empty fields and isFetching=true", () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({}) });
    fetchMock.mockResolvedValueOnce({ json: async () => [] });
    const { result } = renderHook(() => useEquipmentPageData({ equipmentId: "1" }));
    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    expect(result.current.equipmentImg).toBe("");
    expect(result.current.isFetching).toBe(true);
  });

  it("populates fields from /api/lists/<id> and clears isFetching", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        id: 1,
        name: "Camera",
        detail: "DSLR",
        image: "https://example/cam.png",
        usable: true,
      }),
    });
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const { result } = renderHook(() => useEquipmentPageData({ equipmentId: "1" }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.equipmentName).toBe("Camera");
    expect(result.current.equipmentDetail).toBe("DSLR");
    expect(result.current.equipmentImg).toBe("https://example/cam.png");
    expect(fetchMock).toHaveBeenCalledWith("/api/lists/1");
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves");
  });

  it("clears isFetching even if the reserves filter yields no rows", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ name: "X", detail: "", image: "" }),
    });
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        { id: 1, user_id: "u1", start: new Date(), end: new Date(), list_id: 999 }, // different
      ],
    });

    const { result } = renderHook(() => useEquipmentPageData({ equipmentId: "1" }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });
});
