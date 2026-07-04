import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { useTagCreation } from "./use-tag-creation";

const refetchTags = vi.fn(async () => {});
const alertMock = vi.fn();

beforeEach(() => {
  vi.mocked(axios.post).mockReset();
  refetchTags.mockClear();
  alertMock.mockReset();
  vi.stubGlobal("alert", alertMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const defaultParams = {
  existingTags: [
    { id: "1", name: "Audio", color: "#ff0000" },
    { id: "2", name: "Video", color: "#00ff00" },
  ],
  refetchTags,
};

describe("useTagCreation", () => {
  it("alerts and clears name when input is empty", async () => {
    const { result } = renderHook(() => useTagCreation(defaultParams));

    await act(async () => {
      await result.current.submit();
    });

    expect(alertMock).toHaveBeenCalledWith("カテゴリ名は1文字以上入力してください.");
    expect(axios.post).not.toHaveBeenCalled();
    expect(result.current.addTagName).toBe("");
  });

  it("alerts and clears name when tag name is duplicated (after trim)", async () => {
    const { result } = renderHook(() => useTagCreation(defaultParams));

    act(() => {
      result.current.setAddTagName("Audio");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(alertMock).toHaveBeenCalledWith("このカテゴリは既に存在しています.");
    expect(axios.post).not.toHaveBeenCalled();
    expect(result.current.addTagName).toBe("");
  });

  it("posts new tag and refetches on success, clearing name + color", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useTagCreation(defaultParams));

    act(() => {
      result.current.setAddTagName("Lights");
      result.current.setEditTagColor("#0000ff");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(axios.post).toHaveBeenCalledWith(
      "/api/tags",
      {
        name: "Lights",
        color: "#0000ff",
      },
      { headers: managerAuthHeaders() },
    );
    expect(refetchTags).toHaveBeenCalledOnce();
    expect(result.current.addTagName).toBe("");
    expect(result.current.editTagColor).toBe("");
  });

  it("alerts and keeps input when the POST fails (e.g. 403/500)", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("forbidden"));

    const { result } = renderHook(() => useTagCreation(defaultParams));

    act(() => {
      result.current.setAddTagName("Lights");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(alertMock).toHaveBeenCalledWith("カテゴリの作成に失敗しました.");
    expect(refetchTags).not.toHaveBeenCalled();
    // 入力は消さずに再試行できるようにする
    expect(result.current.addTagName).toBe("Lights");
  });

  it("exposes color setter", () => {
    const { result } = renderHook(() => useTagCreation(defaultParams));

    act(() => {
      result.current.setEditTagColor("#abcdef");
    });

    expect(result.current.editTagColor).toBe("#abcdef");
  });
});
