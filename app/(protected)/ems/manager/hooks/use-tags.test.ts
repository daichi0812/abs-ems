import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTags } from "./use-tags";
import { clearClientCache } from "@/lib/client-cache";

const fetchMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  // モジュールスコープのキャッシュがテスト間で漏れないように毎回破棄する
  clearClientCache();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  consoleErrorSpy.mockClear();
});

describe("useTags", () => {
  it("starts with empty tags and isLoading=true", () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useTags());
    expect(result.current.tags).toEqual([]);
    expect(result.current.categories).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("populates both tags and categories from /api/tags on mount", async () => {
    const data = [
      { id: "1", name: "Audio", color: "#ff0000" },
      { id: "2", name: "Video", color: "#00ff00" },
    ];
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });

    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
    expect(result.current.tags).toEqual(data);
    expect(result.current.categories).toEqual(data);
  });

  it("clears isLoading and logs when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.tags).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useTags());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMock.mockClear();
    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledWith("/api/tags");
  });

  it("falls back to empty tags/categories on a non-array (401/500) body", async () => {
    // /api/tags が認証ゲートで {error} を返しても .map がクラッシュしないことを固定
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ error: "認証されていません。" }) });

    const { result } = renderHook(() => useTags());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tags).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });
});
