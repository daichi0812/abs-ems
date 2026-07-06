import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCachedEndpoint } from "./use-cached-endpoint";
import { clearClientCache } from "@/lib/client-cache";

const fetchMock = vi.fn();

beforeEach(() => {
  clearClientCache();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useCachedEndpoint", () => {
  it("初回はスケルトン（isLoading）→取得完了でデータ表示", async () => {
    fetchMock.mockResolvedValue({ json: async () => [{ id: 1 }] });

    const { result } = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.hasLoaded).toBe(true);
  });

  it("再マウント時はキャッシュを即表示し（スケルトンなし）、裏で再検証する", async () => {
    // タブ切り替えのたびに全画面スケルトンへ戻る問題（#47/#57）の回帰防止
    fetchMock.mockResolvedValue({ json: async () => [{ id: 1 }] });

    const first = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    await waitFor(() => expect(first.result.current.hasLoaded).toBe(true));
    first.unmount();

    fetchMock.mockClear();
    fetchMock.mockResolvedValue({ json: async () => [{ id: 1 }, { id: 2 }] });

    const second = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    // キャッシュ即表示: ローディングに戻らず前回データが見えている
    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.data).toEqual([{ id: 1 }]);

    // 裏で再検証されて最新に差し替わる
    await waitFor(() => expect(second.result.current.data).toEqual([{ id: 1 }, { id: 2 }]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("同一URLへの同時リクエストは1本にまとめる", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    renderHook(() => {
      // 同じ画面内で複数フックが同じエンドポイントを見るケース
      useCachedEndpoint("/api/tags");
      useCachedEndpoint("/api/tags");
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("URL が変わったら状態を組み直して取り直す（旧URLのデータを既読扱いしない）", async () => {
    fetchMock.mockResolvedValue({ json: async () => [] });

    const { result, rerender } = renderHook(({ url }) => useCachedEndpoint(url), {
      initialProps: { url: "/api/reserves?user_id=" },
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    fetchMock.mockResolvedValue({ json: async () => [{ id: 9 }] });
    rerender({ url: "/api/reserves?user_id=u1" });

    await waitFor(() => expect(result.current.data).toEqual([{ id: 9 }]));
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1");
  });

  it("非配列ボディ（401/500 の {error}）は空配列にフォールバックする", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ error: "認証されていません。" }) });

    const { result } = renderHook(() => useCachedEndpoint("/api/lists"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("初回失敗は isError、再試行成功で回復する", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("down"));

    const { result } = renderHook(() => useCachedEndpoint("/api/lists"));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasLoaded).toBe(false);

    fetchMock.mockResolvedValue({ json: async () => [] });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
    consoleSpy.mockRestore();
  });
});
