import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEquipmentPageData } from "./use-equipment-page-data";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useEquipmentPageData", () => {
  it("starts with empty fields and isFetching=true", () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({}) });
    const { result } = renderHook(() => useEquipmentPageData({ equipmentId: "1" }));
    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    expect(result.current.equipmentImg).toBe("");
    expect(result.current.isFetching).toBe(true);
  });

  it("populates fields from /api/lists/<id>, clears isFetching, and does NOT fetch all reserves", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        id: 1,
        name: "Camera",
        detail: "DSLR",
        image: "https://example/cam.png",
        usable: true,
      }),
    });

    const { result } = renderHook(() => useEquipmentPageData({ equipmentId: "1" }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.equipmentName).toBe("Camera");
    expect(result.current.equipmentDetail).toBe("DSLR");
    expect(result.current.equipmentImg).toBe("https://example/cam.png");
    expect(fetchMock).toHaveBeenCalledWith("/api/lists/1");
    // かつて結果を捨てていた /api/reserves の全件取得を廃止したことを保証する
    expect(fetchMock).not.toHaveBeenCalledWith("/api/reserves");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears isFetching once the equipment fetch resolves, even with sparse fields", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ name: "X", detail: "", image: "" }),
    });

    const { result } = renderHook(() => useEquipmentPageData({ equipmentId: "1" }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.equipmentName).toBe("X");
  });
});
