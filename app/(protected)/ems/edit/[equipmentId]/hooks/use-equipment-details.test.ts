import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEquipmentDetails } from "./use-equipment-details";

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

describe("useEquipmentDetails", () => {
  it("starts with empty fields", () => {
    fetchMock.mockResolvedValue({ json: async () => ({}) });
    const { result } = renderHook(() => useEquipmentDetails({ equipmentId: "1" }));
    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    expect(result.current.equipmentImg).toBe("");
    expect(result.current.equipmentTag).toBeUndefined();
  });

  it("loads /api/lists/<id> on mount", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        name: "Camera",
        detail: "DSLR",
        image: "https://example/cam.png",
        tag_id: 7,
      }),
    });

    const { result } = renderHook(() => useEquipmentDetails({ equipmentId: "1" }));

    await waitFor(() => expect(result.current.equipmentName).toBe("Camera"));

    expect(fetchMock).toHaveBeenCalledWith("/api/lists/1");
    expect(result.current.equipmentDetail).toBe("DSLR");
    expect(result.current.equipmentImg).toBe("https://example/cam.png");
    expect(result.current.equipmentTag).toBe(7);
  });

  it("logs error on fetch failure", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    renderHook(() => useEquipmentDetails({ equipmentId: "1" }));

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
  });
});
