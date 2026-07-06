import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

// 既定は素通し。縮小のロジック自体は lib/image-compress.test.ts が担う
const { compressImageMock } = vi.hoisted(() => ({
  compressImageMock: vi.fn(async (f: File) => f),
}));
vi.mock("@/lib/image-compress", () => ({
  compressImage: (f: File) => compressImageMock(f),
}));

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
  refetchEquipments.mockClear();
  resetImage.mockClear();
  alertMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("alert", alertMock);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEquipmentRegistration - state", () => {
  it("starts with empty form and no selected tag", () => {
    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));
    expect(result.current.equipmentName).toBe("");
    expect(result.current.equipmentDetail).toBe("");
    // 初期値が "all" だった頃は canSubmit（selectedTag !== ""）を素通りして
    // tag_id 無しの「未分類」機材が登録できてしまっていた（回帰防止）
    expect(result.current.selectedTag).toBe("");
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
    fetchMock.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setEquipmentDetail("DSLR");
      result.current.setSelectedTag("Video");
    });

    await act(async () => {
      await result.current.submit();
    });

    // アップロード API へは行かず、/api/lists への POST 1回のみ
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lists");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      ...managerAuthHeaders(),
    });
    expect(JSON.parse(init.body)).toEqual({
      name: "Camera",
      detail: "DSLR",
      image: "",
      tag_id: "2", // "Video" tag id
    });
    expect(toastSuccess).toHaveBeenCalledWith("機材登録が完了しました");
    expect(refetchEquipments).toHaveBeenCalledOnce();
    expect(resetImage).toHaveBeenCalled();
  });

  it("uploads file to Vercel Blob and posts the returned URL", async () => {
    const file = new File(["xxx"], "test.png", { type: "image/png" });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://blob.example/test.png" }),
      })
      .mockResolvedValueOnce({ ok: true });

    const params = { ...defaultParams, inputFileRef: makeInputRef([file]) };

    const { result } = renderHook(() => useEquipmentRegistration(params));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setSelectedTag("Audio");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/upload?filename=test.png", {
      method: "POST",
      body: file,
      headers: managerAuthHeaders(),
    });
    const [listUrl, listInit] = fetchMock.mock.calls[1];
    expect(listUrl).toBe("/api/lists");
    expect(listInit.method).toBe("POST");
    expect(JSON.parse(listInit.body)).toEqual({
      name: "Camera",
      detail: "",
      image: "https://blob.example/test.png",
      tag_id: "1", // "Audio" tag id
    });
  });

  it("alerts on failure", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setSelectedTag("Video");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(toastError).toHaveBeenCalledWith("機材登録ができません");
    expect(refetchEquipments).not.toHaveBeenCalled();
  });

  it("uploads the compressed file with the compressed filename (name/body の整合)", async () => {
    // compressImage は拡張子を .jpg に変えるため、filename= クエリと body が
    // 同じ「縮小後ファイル」を指していることを固定する
    const original = new File(["x".repeat(1024)], "photo.png", { type: "image/png" });
    const compressed = new File(["y"], "photo.jpg", { type: "image/jpeg" });
    compressImageMock.mockResolvedValueOnce(compressed);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://blob.example/photo.jpg" }),
      })
      .mockResolvedValueOnce({ ok: true });

    const params = { ...defaultParams, inputFileRef: makeInputRef([original]) };
    const { result } = renderHook(() => useEquipmentRegistration(params));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setSelectedTag("Audio");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(compressImageMock).toHaveBeenCalledWith(original);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/upload?filename=photo.jpg", {
      method: "POST",
      body: compressed,
      headers: managerAuthHeaders(),
    });
    const [listUrl, listInit] = fetchMock.mock.calls[1];
    expect(listUrl).toBe("/api/lists");
    expect(JSON.parse(listInit.body)).toEqual(
      expect.objectContaining({ image: "https://blob.example/photo.jpg" })
    );
  });

  it("rejects submit when no existing category is selected", async () => {
    const { result } = renderHook(() => useEquipmentRegistration(defaultParams));

    act(() => {
      result.current.setEquipmentName("Camera");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith("カテゴリを選択してください");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts registration when the image upload responds with an error status", async () => {
    // fetch は HTTP エラーで throw しないため、ok チェックが無いと {error} ボディのまま
    // image:"" で登録が続行され「登録完了」と表示されていた（回帰防止）
    const file = new File(["xxx"], "test.png", { type: "image/png" });
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "権限がありません。" }) });

    const params = { ...defaultParams, inputFileRef: makeInputRef([file]) };
    const { result } = renderHook(() => useEquipmentRegistration(params));

    act(() => {
      result.current.setEquipmentName("Camera");
      result.current.setSelectedTag("Audio");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith(
      "画像のアップロードに失敗しました。機材は登録されていません。"
    );
    // アップロードの1回のみで、/api/lists への POST には到達しない
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/upload?filename=test.png");
  });
});
