import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { useEquipmentRegistration } from "./use-equipment-registration";

const refetchEquipments = vi.fn(async () => {});
const resetImage = vi.fn();
const alertMock = vi.fn();
const fetchMock = vi.fn();

const makeInputRef = (files: File[] = []): React.RefObject<HTMLInputElement> =>
  ({
    current: { files } as unknown as HTMLInputElement,
  });

const defaultParams = {
  tags: [
    { id: "1", name: "Audio", color: "#ff0000" },
    { id: "2", name: "Video", color: "#00ff00" },
  ],
  inputFileRef: makeInputRef(),
  resetImage,
  refetchEquipments,
};

beforeEach(() => {
  vi.mocked(axios.post).mockReset();
  refetchEquipments.mockClear();
  resetImage.mockClear();
  alertMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("alert", alertMock);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEquipmentRegistration - state", () => {
  it("starts with empty form and selectedTag='all'", () => {
    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));
    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    expect(result.current.selectedTag).toBe("all");
  });

  it("setters update state", () => {
    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setEquipmentDetail("DSLR");
      result.current.setSelectedTag("Video");
    });

    expect(result.current.equipmentName).toBe("Camera");
    expect(result.current.equipmentDetail).toBe("DSLR");
    expect(result.current.selectedTag).toBe("Video");
  });
});

describe("useEquipmentRegistration - cancel", () => {
  it("clears all form state and triggers resetImage", () => {
    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setEquipmentDetail("DSLR");
      result.current.setSelectedTag("Video");
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    expect(result.current.selectedTag).toBe("");
    expect(resetImage).toHaveBeenCalled();
  });
});

describe("useEquipmentRegistration - submit", () => {
  it("posts to /api/lists without upload when no file selected", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setEquipmentDetail("DSLR");
      result.current.setSelectedTag("Video");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      "/api/lists",
      {
        name: "Camera",
        detail: "DSLR",
        image: "",
        tag_id: "2", // "Video" tag id
      },
      { headers: managerAuthHeaders() },
    );
    expect(alertMock).toHaveBeenCalledWith("機材登録が完了しました");
    expect(refetchEquipments).toHaveBeenCalledOnce();
    expect(resetImage).toHaveBeenCalled();
  });

  it("uploads file to Vercel Blob and posts the returned URL", async () => {
    const file = new File(["xxx"], "test.png", { type: "image/png" });
    fetchMock.mockResolvedValue({ json: async () => ({ url: "https://blob.example/test.png" }) });
    vi.mocked(axios.post).mockResolvedValue({ status: 200 } as never);

    const params = { ...defaultParams, inputFileRef: makeInputRef([file]) };

    const { result } = renderHook(() => useEquipmentRegistration(params));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setSelectedTag("Audio");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/upload?filename=test.png", {
      method: "POST",
      body: file,
      headers: managerAuthHeaders(),
    });
    expect(axios.post).toHaveBeenCalledWith(
      "/api/lists",
      {
        name: "Camera",
        detail: "",
        image: "https://blob.example/test.png",
        tag_id: "1", // "Audio" tag id
      },
      { headers: managerAuthHeaders() },
    );
  });

  it("alerts on failure", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(alertMock).toHaveBeenCalledWith("機材登録ができません");
    expect(refetchEquipments).not.toHaveBeenCalled();
  });
});
