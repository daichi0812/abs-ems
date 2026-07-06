import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReserves } from "./use-reserves";
import { clearClientCache } from "@/lib/client-cache";
import { dayIndexToDateString, todayJstDayIndex } from "@/lib/calendar/date-grid";

// 空き判定に過去の予約は不要なので、フックは「今日(JST)以降」で絞って取得する
const RESERVES_URL = `/api/reserves?from=${dayIndexToDateString(todayJstDayIndex())}`;

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

describe("useReserves", () => {
  it("starts with empty reserves", () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useReserves());
    expect(result.current.reserves).toEqual([]);
  });

  it("fetches today-onward reserves on mount and stores result", async () => {
    const data = [
      { id: 1, user_id: "u1", start: "2026-01-01", end: "2026-01-02", list_id: 1 },
    ];
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });

    const { result } = renderHook(() => useReserves());

    await waitFor(() => expect(result.current.reserves).toHaveLength(1));

    expect(fetchMock).toHaveBeenCalledWith(RESERVES_URL);
    expect(result.current.reserves).toEqual(data);
  });

  it("logs and continues when fetch fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useReserves());

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

    expect(result.current.reserves).toEqual([]);
    // エラーを isError で返す（黙って「全件空き」と誤表示しない）
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes isLoading until the first fetch settles", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useReserves());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
  });

  it("refetches when the tab becomes visible again", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    renderHook(() => useReserves());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("does not refetch when the tab is hidden", async () => {
    // 「visible のときだけ再取得する」契約の負分岐を固定する
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    renderHook(() => useReserves());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    try {
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, 20));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(document, "visibilityState");
    }
  });

  it("keeps hasLoaded=false on initial failure, then recovers via refetch", async () => {
    // hasLoaded は「全画面エラーは初回ロード失敗のときだけ」の判定に使われる
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("down"));

    const { result } = renderHook(() => useReserves());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasLoaded).toBe(false);

    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.isError).toBe(false);
    consoleSpy.mockRestore();
  });

  it("keeps hasLoaded=true when a background refetch fails after a success", async () => {
    // 成功後の visibilitychange 再取得が失敗しても、表示中のデータを
    // 全画面エラーで置き換えないための契約（isError は立つが hasLoaded は保持）
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useReserves());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    fetchMock.mockRejectedValue(new Error("down"));
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.hasLoaded).toBe(true);
    consoleSpy.mockRestore();
  });

  it("refetch re-runs the fetch", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useReserves());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await result.current.refetch();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to empty reserves on a non-array (401/500) body", async () => {
    // /api/reserves が認証ゲートで {error} を返しても競合判定/描画がクラッシュしないことを固定。
    // ガードが外れると setReserves がオブジェクトを格納し toEqual([]) が落ちる。
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ error: "認証されていません。" }) });

    const { result } = renderHook(() => useReserves());
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.reserves).toEqual([]);
  });
});
