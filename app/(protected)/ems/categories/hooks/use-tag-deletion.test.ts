import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { managerAuthHeaders } from "@/lib/manager-auth";
import { useTagDeletion } from "./use-tag-deletion";

const refetchTags = vi.fn(async () => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  refetchTags.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
  consoleErrorSpy.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTagDeletion", () => {
  it("DELETEs, refetches, toasts success, and returns true", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    const ok = await result.current.deleteTag(5);

    expect(fetchMock).toHaveBeenCalledWith("/api/tags/5", {
      method: "DELETE",
      headers: managerAuthHeaders(),
    });
    expect(toastSuccess).toHaveBeenCalledWith("カテゴリを削除しました");
    expect(refetchTags).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });

  it("toasts error, does not refetch, and returns false on failure", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    const ok = await result.current.deleteTag(5);

    expect(toastError).toHaveBeenCalledWith("カテゴリの削除に失敗しました");
    expect(refetchTags).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});
