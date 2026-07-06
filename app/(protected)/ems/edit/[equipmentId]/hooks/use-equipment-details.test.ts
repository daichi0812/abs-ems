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
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderHook(() => useEquipmentDetails({ equipmentId: "1" }));
    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    expect(result.current.equipmentImg).toBe("");
    expect(result.current.equipmentTag).toBeUndefined();
  });

  it("loads /api/lists/<id> on mount", async () => {
    fetchMock.mockResolvedValue({
      ok: true, json: async () => ({
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

  it("exposes isLoading until the fetch settles (空フォームの先出し・入力上書きの防止)", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ name: "Camera" }) });

    const { result } = renderHook(() => useEquipmentDetails({ equipmentId: "1" }));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
  });

  it("reports isError on an HTTP error body instead of silently emptying the form", async () => {
    // 404/500 の {error} ボディをパースすると undefined が入り無言の空フォームになっていた
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "not found" }) });

    const { result } = renderHook(() => useEquipmentDetails({ equipmentId: "1" }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it("recovers via refetch after a failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useEquipmentDetails({ equipmentId: "1" }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ name: "Camera" }) });
    await result.current.refetch();

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.equipmentName).toBe("Camera");
  });
});
