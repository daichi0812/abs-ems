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
    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] });

    const { result } = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.hasLoaded).toBe(true);
  });

  it("再マウント時はキャッシュを即表示し（スケルトンなし）、裏で再検証する", async () => {
    // タブ切り替えのたびに全画面スケルトンへ戻る問題（#47/#57）の回帰防止
    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] });

    const first = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    await waitFor(() => expect(first.result.current.hasLoaded).toBe(true));
    first.unmount();

    fetchMock.mockClear();
    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }, { id: 2 }] });

    const second = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    // キャッシュ即表示: ローディングに戻らず前回データが見えている
    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.data).toEqual([{ id: 1 }]);

    // 裏で再検証されて最新に差し替わる
    await waitFor(() => expect(second.result.current.data).toEqual([{ id: 1 }, { id: 2 }]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("同一URLへの同時リクエストは1本にまとめる", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

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
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    const { result, rerender } = renderHook(({ url }) => useCachedEndpoint(url), {
      initialProps: { url: "/api/reserves?user_id=" },
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 9 }] });
    rerender({ url: "/api/reserves?user_id=u1" });

    await waitFor(() => expect(result.current.data).toEqual([{ id: 9 }]));
    expect(fetchMock).toHaveBeenCalledWith("/api/reserves?user_id=u1");
  });

  it("旧URLの遅い応答が後着しても、新URLの表示を上書きしない", async () => {
    let resolveOld: ((v: unknown) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveOld = resolve; })
    );

    const { result, rerender } = renderHook(({ url }) => useCachedEndpoint<{ id: string }>(url), {
      initialProps: { url: "/api/reserves?user_id=" },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [{ id: "new" }] });
    rerender({ url: "/api/reserves?user_id=u1" });
    await waitFor(() => expect(result.current.data).toEqual([{ id: "new" }]));

    // 旧URL（user_id=）の応答が遅れて届く
    await act(async () => {
      resolveOld!({ ok: true, json: async () => [{ id: "old" }] });
      await Promise.resolve();
    });
    expect(result.current.data).toEqual([{ id: "new" }]);
  });

  it("非配列ボディ（401/500 の {error}）はキャッシュせず isError にする", async () => {
    // エラー応答を「正常な空配列」としてキャッシュすると、誤った空表示が
    // タブセッション全体（他画面の同一エンドポイント）へ伝播するため、エラー扱いにする
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ error: "認証されていません。" }) });

    const { result } = renderHook(() => useCachedEndpoint("/api/lists"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]); // 表示用データは空のまま（.map 保護は維持）
    expect(result.current.isError).toBe(true);
    expect(result.current.hasLoaded).toBe(false);

    // 復旧後の再マウントは正常データを取得できる（汚染キャッシュが残っていない）
    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] });
    const second = renderHook(() => useCachedEndpoint<{ id: number }>("/api/lists"));
    expect(second.result.current.isLoading).toBe(true); // [] が「既読」扱いになっていない
    await waitFor(() => expect(second.result.current.data).toEqual([{ id: 1 }]));
    consoleSpy.mockRestore();
  });

  it("HTTP エラーステータス（ok=false）はキャッシュせず isError にする", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => [] });

    const { result } = renderHook(() => useCachedEndpoint("/api/lists"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    consoleSpy.mockRestore();
  });

  it("refetch は進行中のリクエストに相乗りせず新規発行する（変更直後の巻き戻り防止）", async () => {
    // 変更（POST/PATCH）成功後の refetch が「変更前に発行された GET」に相乗りすると、
    // 変更前のスナップショットがキャッシュと画面に固定される
    let resolveOld: ((v: unknown) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveOld = resolve; })
    );

    const { result } = renderHook(() => useCachedEndpoint<{ id: string }>("/api/tags"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // 変更後の再取得は新規リクエストとして飛ぶ
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [{ id: "after" }] });
    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([{ id: "after" }]);

    // 変更前に発行された古い応答が後着しても、新しい結果を上書きしない
    await act(async () => {
      resolveOld!({ ok: true, json: async () => [{ id: "before" }] });
      await Promise.resolve();
    });
    expect(result.current.data).toEqual([{ id: "after" }]);
  });

  it("初回失敗は isError、再試行成功で回復する", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("down"));

    const { result } = renderHook(() => useCachedEndpoint("/api/lists"));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasLoaded).toBe(false);

    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.hasLoaded).toBe(true);
    consoleSpy.mockRestore();
  });
});
