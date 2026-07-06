import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCalendarData,
  calendarWindowUrl,
  prefetchCalendarWindow,
} from "./use-calendar-data";
import { clearClientCache, getCachedData } from "@/lib/client-cache";
import { toJstDayIndex } from "@/lib/calendar/date-grid";

const fetchMock = vi.fn();
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
  // モジュールスコープのキャッシュがテスト間で漏れないように毎回破棄する
  clearClientCache();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  consoleLogSpy.mockClear();
});

// 1月の月グリッド相当の窓（"YYYY-MM-DD" は UTC 00:00 として解釈され、そのまま JST 暦日の day index になる）
const JAN_FROM = toJstDayIndex("2026-01-01");
const JAN_TO = toJstDayIndex("2026-01-31");
const FEB_FROM = toJstDayIndex("2026-02-01");
const FEB_TO = toJstDayIndex("2026-02-28");

const payload = (overrides: Record<string, unknown> = {}) => ({
  users: [{ id: "u1", name: "Taro" }],
  lists: [{ id: 1, name: "Camera", tag_id: 10 }],
  tags: [{ id: 10, name: "Audio", color: "#ff0000" }],
  reserves: [
    {
      id: 100,
      user_id: "u1",
      start: "2026-01-01",
      end: "2026-01-05",
      list_id: 1,
      isRenting: 0,
    },
  ],
  ...overrides,
});

const okResponse = (body: unknown) => ({ ok: true, json: async () => body });

describe("calendarWindowUrl", () => {
  it("formats day indices as YYYY-MM-DD query params", () => {
    expect(calendarWindowUrl(JAN_FROM, JAN_TO)).toBe(
      "/api/calendar?from=2026-01-01&to=2026-01-31"
    );
  });
});

describe("useCalendarData", () => {
  it("starts with empty events and isFetching=true", () => {
    fetchMock.mockResolvedValue(okResponse(payload()));
    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    expect(result.current.allEvents).toEqual([]);
    expect(result.current.isFetching).toBe(true);
  });

  it("calls the consolidated endpoint once with the window as from/to", async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));
    renderHook(() => useCalendarData(JAN_FROM, JAN_TO));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/calendar?from=2026-01-01&to=2026-01-31");
  });

  it("builds calendar events with mapped user name, equipment title, and tag color", async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));
    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents).toHaveLength(1);
    const ev = result.current.allEvents[0];
    expect(ev.id).toBe(100);
    expect(ev.title).toBe("Camera");
    expect(ev.name).toBe("Taro");
    expect(ev.isRenting).toBe(0);
    expect(ev.list_id).toBe(1);
    expect(ev.backgroundColor).toBe("#ff0000");
    expect(ev.borderColor).toBe("#ff0000");
    // pure red has low YIQ brightness (76) → white text
    expect(ev.textColor).toBe("#ffffff");
    expect(ev.allDay).toBe(true);
  });

  it("keeps end as the inclusive last day (no FullCalendar +1)", async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));
    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    const end = result.current.allEvents[0].end as Date;
    // 予約末日 2026-01-05 をそのまま保持（UTC で比較して TZ 非依存にする）
    expect(end.getUTCDate()).toBe(5);
  });

  it("falls back to default color when tag color is missing", async () => {
    fetchMock.mockResolvedValue(
      okResponse(payload({ lists: [{ id: 1, name: "Camera", tag_id: 999 }], tags: [] }))
    );
    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents[0].backgroundColor).toBe("#3788D8");
  });

  it("handles empty reserves response", async () => {
    fetchMock.mockResolvedValue(okResponse(payload({ reserves: [] })));
    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents).toEqual([]);
  });

  it("stops the skeleton and reports isError when the fetch rejects", async () => {
    // fetch 失敗で isFetching が下りず無限スケルトンにならないこと（回帰防止）
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.allEvents).toEqual([]);
    consoleErrorSpy.mockRestore();
  });

  it("treats an {error} body as a failure instead of caching it as empty data", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(okResponse({ error: "認証されていません。" }));

    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(getCachedData(calendarWindowUrl(JAN_FROM, JAN_TO))).toBeUndefined();
    consoleErrorSpy.mockRestore();
  });

  it("does not flip to isError when a revalidation fails after data has loaded", async () => {
    // 取得済みデータがあるのに再検証（タブ復帰・操作後）の失敗で全画面エラーへ
    // 乗っ取られないための契約（isError は「初回ロード失敗」専用）
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(okResponse(payload()));

    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.allEvents).toHaveLength(1);

    fetchMock.mockRejectedValue(new Error("network down"));
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.allEvents).toHaveLength(1);
    consoleErrorSpy.mockRestore();
  });

  it("recovers after a successful refetch", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    await waitFor(() => expect(result.current.isError).toBe(true));

    fetchMock.mockResolvedValue(okResponse(payload({ reserves: [] })));
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.isFetching).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it("keeps showing the previous window while the next window is loading, then swaps", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(payload()));
    const { result, rerender } = renderHook(
      ({ from, to }: { from: number; to: number }) => useCalendarData(from, to),
      { initialProps: { from: JAN_FROM, to: JAN_TO } }
    );
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.allEvents).toHaveLength(1);

    // 2月の応答を保留し、その間の表示を確認する
    let resolveFeb!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFeb = resolve))
    );
    rerender({ from: FEB_FROM, to: FEB_TO });

    // スケルトンへ戻さず、前の窓（1月）のデータを出したまま裏で取得する
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isWindowLoading).toBe(true);
    expect(result.current.allEvents).toHaveLength(1);

    await act(async () => {
      resolveFeb(okResponse(payload({ reserves: [] })));
    });
    await waitFor(() => expect(result.current.isWindowLoading).toBe(false));
    expect(result.current.allEvents).toEqual([]);
  });

  it("reports isWindowError (not full-screen isError) when only the new window fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(okResponse(payload()));
    const { result, rerender } = renderHook(
      ({ from, to }: { from: number; to: number }) => useCalendarData(from, to),
      { initialProps: { from: JAN_FROM, to: JAN_TO } }
    );
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    fetchMock.mockRejectedValue(new Error("network down"));
    rerender({ from: FEB_FROM, to: FEB_TO });
    await waitFor(() => expect(result.current.isWindowError).toBe(true));

    // 前の窓のデータは残す（全画面エラーで隠さない）
    expect(result.current.isError).toBe(false);
    expect(result.current.allEvents).toHaveLength(1);
    consoleErrorSpy.mockRestore();
  });

  it("prefetchCalendarWindow warms the cache so the next mount shows data immediately", async () => {
    fetchMock.mockResolvedValue(okResponse(payload()));

    prefetchCalendarWindow(JAN_FROM, JAN_TO);
    await waitFor(() =>
      expect(getCachedData(calendarWindowUrl(JAN_FROM, JAN_TO))).toBeDefined()
    );

    const { result } = renderHook(() => useCalendarData(JAN_FROM, JAN_TO));
    // キャッシュ済みなのでスケルトンを経由しない
    expect(result.current.isFetching).toBe(false);
    expect(result.current.allEvents).toHaveLength(1);
  });
});
