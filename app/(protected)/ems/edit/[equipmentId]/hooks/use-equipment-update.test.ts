import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(protected)/ems/manager/useGetImageUrl", () => ({
  useGetImageUrl: () => ({ imageUrl: "data:image/png;base64,xxx" }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { managerAuthHeaders } from "@/lib/manager-auth";
import { useEquipmentUpdate } from "./use-equipment-update";

const onSuccess = vi.fn();
const alertMock = vi.fn();
const fetchMock = vi.fn();
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  onSuccess.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
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
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    await act(async () => {
      await result.current.submit();
    });

    // アップロード API へは行かず、/api/lists/5 への PUT 1回のみ
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lists/5");
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      ...managerAuthHeaders(),
    });
    expect(JSON.parse(init.body)).toEqual({
      name: "Camera",
      detail: "DSLR",
      image: "https://existing/img.png",
      tag_id: 1,
    });
    expect(toastSuccess).toHaveBeenCalledWith("機材情報を更新しました");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("uploads new file then PUTs with returned URL", async () => {
    const file = new File(["x"], "test.png", { type: "image/png" });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ url: "https://blob/test.png" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    act(() => {
      result.current.onFileChange({
        currentTarget: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/upload?filename=test.png", {
      method: "POST",
      body: file,
      headers: managerAuthHeaders(),
    });
    const [putUrl, putInit] = fetchMock.mock.calls[1];
    expect(putUrl).toBe("/api/lists/5");
    expect(putInit.method).toBe("PUT");
    expect(JSON.parse(putInit.body)).toEqual(
      expect.objectContaining({ image: "https://blob/test.png" })
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("alerts and aborts when image upload responds with an error status", async () => {
    // fetch は HTTP エラーで throw しないため、ok チェックが無いと {error} ボディをパースして
    // image:undefined のまま PUT が成功し「古い画像のまま更新しました」になっていた（回帰防止）
    const file = new File(["x"], "test.png", { type: "image/png" });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ error: "権限がありません。" }),
    });

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    act(() => {
      result.current.onFileChange({
        currentTarget: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(toastError).toHaveBeenCalledWith("画像のアップロードに失敗しました");
    // アップロードの1回のみで、/api/lists への PUT には到達しない
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/upload?filename=test.png");
    expect(onSuccess).not.toHaveBeenCalled();
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

    expect(toastError).toHaveBeenCalledWith("画像のアップロードに失敗しました");
    // fetch はアップロードで reject した1回のみで、/api/lists への PUT には到達しない
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/upload?filename=test.png");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("alerts on PUT failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: "server" }),
    });

    const { result } = renderHook(() => useEquipmentUpdate(defaultParams()));

    await act(async () => {
      await result.current.submit();
    });

    expect(toastError).toHaveBeenCalledWith("機材情報の更新に失敗しました");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
