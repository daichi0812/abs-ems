import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const isAxiosError = vi.fn(() => false);
  return {
    default: { put: vi.fn(), isAxiosError },
  };
});

vi.mock("@/app/(protected)/ems/manager/useGetImageUrl", () => ({
  useGetImageUrl: () => ({ imageUrl: "data:image/png;base64,xxx" }),
}));

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { useEquipmentUpdate } from "./use-equipment-update";

const onSuccess = vi.fn();
const alertMock = vi.fn();
const fetchMock = vi.fn();
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.put).mockReset();
  onSuccess.mockClear();
  alertMock.mockReset();
  fetchMock.mockReset();
  consoleLogSpy.mockClear();
  consoleErrorSpy.mockClear();
  vi.stubGlobal("alert", alertMock);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const defaultParams = () => ({
  equipmentId: "5",
  equipmentName: "Camera",
  equipmentDetail: "DSLR",
  currentImageUrl: "https://existing/img.png",
  selectedTagName: "Audio",
  tags: [
    { id: 1, name: "Audio", color: "#ff0000" },
    { id: 2, name: "Video", color: "#00ff00" },
  ],
  onSuccess,
});

describe("useEquipmentUpdate - file selection", () => {
  it("starts with no imageFile", () => {
    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));
    expect(result.current.imageFile).toBeNull();
  });

  it("onFileChange stores the selected file", () => {
    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));
    const file = new File(["x"], "test.png", { type: "image/png" });

    act(() => {
      result.current.onFileChange({
        currentTarget: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.imageFile).toBe(file);
  });

  it("ignores changes when no file is provided", () => {
    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    act(() => {
      result.current.onFileChange({
        currentTarget: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.imageFile).toBeNull();
  });
});

describe("useEquipmentUpdate - submit", () => {
  it("PUTs with current image URL when no new file selected", async () => {
    vi.mocked(axios.put).mockResolvedValue({ data: {} } as never);

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(axios.put).toHaveBeenCalledWith(
      "/api/lists/5",
      {
        name: "Camera",
        detail: "DSLR",
        image: "https://existing/img.png",
        tag_id: 1,
      },
      { headers: { "Content-Type": "application/json", ...managerAuthHeaders() } },
    );
    expect(alertMock).toHaveBeenCalledWith("機材情報が更新されました");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("uploads new file then PUTs with returned URL", async () => {
    const file = new File(["x"], "test.png", { type: "image/png" });
    fetchMock.mockResolvedValue({
      text: async () => JSON.stringify({ url: "https://blob/test.png" }),
    });
    vi.mocked(axios.put).mockResolvedValue({ data: {} } as never);

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    act(() => {
      result.current.onFileChange({
        currentTarget: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/upload?filename=test.png", {
      method: "POST",
      body: file,
    });
    expect(axios.put).toHaveBeenCalledWith(
      "/api/lists/5",
      expect.objectContaining({ image: "https://blob/test.png" }),
      expect.any(Object),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("alerts and aborts when image upload fails", async () => {
    const file = new File(["x"], "test.png", { type: "image/png" });
    fetchMock.mockRejectedValue(new Error("blob down"));

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    act(() => {
      result.current.onFileChange({
        currentTarget: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(alertMock).toHaveBeenCalledWith("画像のアップロードに失敗しました");
    expect(axios.put).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("alerts on PUT failure", async () => {
    vi.mocked(axios.put).mockRejectedValue(new Error("server"));

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    await act(async () => {
      await result.current.submit();
    });

    expect(alertMock).toHaveBeenCalledWith("機材情報の更新に失敗しました");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
