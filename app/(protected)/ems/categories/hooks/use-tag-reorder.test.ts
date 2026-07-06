import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { patch: vi.fn() },
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a) },
}));

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { useTagReorder } from "./use-tag-reorder";
import type { Tag } from "@/types/domain";

const tags: Tag[] = [
  { id: 1, name: "A", color: "#111111", sortOrder: 0 },
  { id: 2, name: "B", color: "#222222", sortOrder: 1 },
  { id: 3, name: "C", color: "#333333", sortOrder: 2 },
];

const refetchTags = vi.fn(async () => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.patch).mockReset();
  refetchTags.mockClear();
  toastError.mockReset();
  consoleErrorSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTagReorder", () => {
  it("initializes order from tags", () => {
    const { result } = renderHook(() => useTagReorder({ tags, refetchTags }));
    expect(result.current.order.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("moveDown swaps optimistically and PATCHes the new order", async () => {
    vi.mocked(axios.patch).mockResolvedValue({ status: 200 } as never);
    const { result } = renderHook(() => useTagReorder({ tags, refetchTags }));

    await act(async () => {
      result.current.moveDown(0);
    });

    expect(result.current.order.map((t) => t.id)).toEqual([2, 1, 3]);
    expect(axios.patch).toHaveBeenCalledWith(
      "/api/tags/reorder",
      { orderedIds: [2, 1, 3] },
      { headers: managerAuthHeaders() },
    );
    expect(refetchTags).toHaveBeenCalled();
  });

  it("moveUp at the top is a no-op", async () => {
    const { result } = renderHook(() => useTagReorder({ tags, refetchTags }));

    await act(async () => {
      result.current.moveUp(0);
    });

    expect(result.current.order.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(axios.patch).not.toHaveBeenCalled();
  });

  it("rolls back via refetch and toasts on PATCH failure", async () => {
    vi.mocked(axios.patch).mockRejectedValue(new Error("server"));
    const { result } = renderHook(() => useTagReorder({ tags, refetchTags }));

    await act(async () => {
      result.current.moveDown(1);
    });

    expect(toastError).toHaveBeenCalledWith("並び順の変更に失敗しました");
    expect(refetchTags).toHaveBeenCalled();
  });
});
