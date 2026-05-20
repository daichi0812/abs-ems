import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { put: vi.fn() },
}));

import axios from "axios";
import { useTagEditing } from "./use-tag-editing";

const refetchTags = vi.fn(async () => {});
const alertMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.put).mockReset();
  refetchTags.mockClear();
  alertMock.mockReset();
  consoleErrorSpy.mockClear();
  vi.stubGlobal("alert", alertMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTagEditing - state", () => {
  it("starts with no editTagId", () => {
    const { result } = renderHook(() => useTagEditing({ refetchTags }));
    expect(result.current.editTagId).toBeNull();
  });

  it("startEdit sets id, name, color", () => {
    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "Audio", "#ff0000");
    });

    expect(result.current.editTagId).toBe(5);
    expect(result.current.editTagName).toBe("Audio");
    expect(result.current.editTagColor).toBe("#ff0000");
  });

  it("cancelEdit clears editTagId", () => {
    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "Audio", "#ff0000");
    });
    act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editTagId).toBeNull();
  });
});

describe("useTagEditing - saveEdit", () => {
  it("alerts when name is empty/whitespace", async () => {
    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "   ", "#fff");
    });

    await act(async () => {
      await result.current.saveEdit(5);
    });

    expect(alertMock).toHaveBeenCalledWith("カテゴリ名を入力してください.");
    expect(axios.put).not.toHaveBeenCalled();
  });

  it("PUTs the tag and refetches on success", async () => {
    vi.mocked(axios.put).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "Audio", "#ff0000");
    });

    await act(async () => {
      await result.current.saveEdit(5);
    });

    expect(axios.put).toHaveBeenCalledWith("/api/tags/5", {
      name: "Audio",
      color: "#ff0000",
    });
    expect(alertMock).toHaveBeenCalledWith("カテゴリが更新されました.");
    expect(refetchTags).toHaveBeenCalledOnce();
    expect(result.current.editTagId).toBeNull();
  });

  it("alerts on PUT failure", async () => {
    vi.mocked(axios.put).mockRejectedValue(new Error("server"));

    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "Audio", "#ff0000");
    });

    await act(async () => {
      await result.current.saveEdit(5);
    });

    expect(alertMock).toHaveBeenCalledWith("カテゴリの更新に失敗しました.");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
