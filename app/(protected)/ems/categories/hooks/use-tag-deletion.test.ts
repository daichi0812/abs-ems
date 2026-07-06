import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { delete: vi.fn() },
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
import { useTagDeletion } from "./use-tag-deletion";

const refetchTags = vi.fn(async () => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.delete).mockReset();
  refetchTags.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
  consoleErrorSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTagDeletion", () => {
  it("DELETEs, refetches, toasts success, and returns true", async () => {
    vi.mocked(axios.delete).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    const ok = await result.current.deleteTag(5);

    expect(axios.delete).toHaveBeenCalledWith("/api/tags/5", {
      headers: managerAuthHeaders(),
    });
    expect(toastSuccess).toHaveBeenCalledWith("カテゴリを削除しました");
    expect(refetchTags).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });

  it("toasts error, does not refetch, and returns false on failure", async () => {
    vi.mocked(axios.delete).mockRejectedValue(new Error("server"));

    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    const ok = await result.current.deleteTag(5);

    expect(toastError).toHaveBeenCalledWith("カテゴリの削除に失敗しました");
    expect(refetchTags).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});
