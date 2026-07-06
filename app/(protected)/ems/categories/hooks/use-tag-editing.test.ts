import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { put: vi.fn() },
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { useTagEditing } from "./use-tag-editing";

const refetchTags = vi.fn(async () => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.put).mockReset();
  refetchTags.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
  consoleErrorSpy.mockClear();
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
  it("toasts error and returns false when name is empty/whitespace", async () => {
    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "   ", "#fff");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveEdit(5);
    });

    expect(toastError).toHaveBeenCalledWith("カテゴリ名を入力してください");
    expect(axios.put).not.toHaveBeenCalled();
    expect(ok).toBe(false);
  });

  it("toasts error when renaming to an existing category name (自分以外との重複)", async () => {
    // 同名カテゴリを許すと機材フォームのチップが2つ点灯し、保存時に別カテゴリへ
    // 黙って付け替わるため、追加側（use-tag-add）と同じ重複チェックを行う
    const { result } = renderHook(() =>
      useTagEditing({
        refetchTags,
        existingTags: [
          { id: 5, name: "音響" },
          { id: 6, name: "カメラ" },
        ],
      })
    );

    act(() => {
      result.current.startEdit(5, "音響", "#ff0000");
      result.current.setEditTagName("カメラ");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveEdit(5);
    });

    expect(toastError).toHaveBeenCalledWith("同じ名前のカテゴリがすでにあります");
    expect(axios.put).not.toHaveBeenCalled();
    expect(ok).toBe(false);
  });

  it("allows saving the same name for the tag itself (自分自身は重複扱いしない)", async () => {
    vi.mocked(axios.put).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() =>
      useTagEditing({ refetchTags, existingTags: [{ id: 5, name: "音響" }] })
    );

    act(() => {
      result.current.startEdit(5, "音響", "#ff0000");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveEdit(5);
    });

    expect(ok).toBe(true);
  });

  it("PUTs the tag, refetches, and returns true on success", async () => {
    vi.mocked(axios.put).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "Audio", "#ff0000");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveEdit(5);
    });

    expect(axios.put).toHaveBeenCalledWith(
      "/api/tags/5",
      {
        name: "Audio",
        color: "#ff0000",
      },
      { headers: managerAuthHeaders() },
    );
    expect(toastSuccess).toHaveBeenCalledWith("カテゴリを更新しました");
    expect(refetchTags).toHaveBeenCalledOnce();
    expect(result.current.editTagId).toBeNull();
    expect(ok).toBe(true);
  });

  it("toasts error and returns false on PUT failure", async () => {
    vi.mocked(axios.put).mockRejectedValue(new Error("server"));

    const { result } = renderHook(() => useTagEditing({ refetchTags }));

    act(() => {
      result.current.startEdit(5, "Audio", "#ff0000");
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.saveEdit(5);
    });

    expect(toastError).toHaveBeenCalledWith("カテゴリの更新に失敗しました");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});
