import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { delete: vi.fn() },
}));

import axios from "axios";
import { managerAuthHeaders } from "@/lib/manager-auth";
import { useTagDeletion } from "./use-tag-deletion";

const refetchTags = vi.fn(async () => {});
const alertMock = vi.fn();
const confirmMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.delete).mockReset();
  refetchTags.mockClear();
  alertMock.mockReset();
  confirmMock.mockReset();
  consoleErrorSpy.mockClear();
  vi.stubGlobal("alert", alertMock);
  vi.stubGlobal("confirm", confirmMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTagDeletion", () => {
  it("does nothing when confirm is cancelled", async () => {
    confirmMock.mockReturnValue(false);
    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    await result.current.deleteTag(5);

    expect(axios.delete).not.toHaveBeenCalled();
    expect(refetchTags).not.toHaveBeenCalled();
  });

  it("DELETEs and refetches when confirm is accepted", async () => {
    confirmMock.mockReturnValue(true);
    vi.mocked(axios.delete).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    await result.current.deleteTag(5);

    expect(axios.delete).toHaveBeenCalledWith("/api/tags/5", {
      headers: managerAuthHeaders(),
    });
    expect(alertMock).toHaveBeenCalledWith("カテゴリが削除されました.");
    expect(refetchTags).toHaveBeenCalledOnce();
  });

  it("alerts on DELETE failure", async () => {
    confirmMock.mockReturnValue(true);
    vi.mocked(axios.delete).mockRejectedValue(new Error("server"));

    const { result } = renderHook(() => useTagDeletion({ refetchTags }));

    await result.current.deleteTag(5);

    expect(alertMock).toHaveBeenCalledWith("カテゴリの削除に失敗しました.");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
