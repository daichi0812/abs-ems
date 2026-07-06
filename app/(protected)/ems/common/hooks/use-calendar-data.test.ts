import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarData } from "./use-calendar-data";
import { clearClientCache } from "@/lib/client-cache";

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

const setupHappyPath = () => {
  // /api/users（Prisma User の形: キーは id）
  fetchMock.mockResolvedValueOnce({
    json: async () => [{ id: "u1", name: "Taro" }],
  });
  // /api/lists
  fetchMock.mockResolvedValueOnce({
    json: async () => [{ id: 1, name: "Camera", detail: "", image: "", usable: true, tag_id: 10 }],
  });
  // /api/tags
  fetchMock.mockResolvedValueOnce({
    json: async () => [{ id: 10, name: "Audio", color: "#ff0000" }],
  });
  // /api/reserves
  fetchMock.mockResolvedValueOnce({
    json: async () => [
      {
        id: 100,
        user_id: "u1",
        start: "2026-01-01",
        end: "2026-01-05",
        list_id: 1,
        isRenting: 0,
      },
    ],
  });
};

describe("useCalendarData", () => {
  it("starts with empty events and isFetching=true", () => {
    fetchMock.mockResolvedValue({ json: async () => [] });
    const { result } = renderHook(() => useCalendarData());
    expect(result.current.allEvents).toEqual([]);
    expect(result.current.isFetching).toBe(true);
  });

  it("calls the four API endpoints in order on mount", async () => {
    setupHappyPath();
    renderHook(() => useCalendarData());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/users");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/lists");
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/tags");
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/reserves");
  });

  it("builds calendar events with mapped user name, equipment title, and tag color", async () => {
    setupHappyPath();
    const { result } = renderHook(() => useCalendarData());

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
    setupHappyPath();
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    const end = result.current.allEvents[0].end as Date;
    // 予約末日 2026-01-05 をそのまま保持（UTC で比較して TZ 非依存にする）
    expect(end.getUTCDate()).toBe(5);
  });

  it("falls back to default color when tag color is missing", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: "u1", name: "Taro" }] });
    fetchMock.mockResolvedValueOnce({
      json: async () => [{ id: 1, name: "Camera", detail: "", image: "", usable: true, tag_id: 999 }],
    });
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // no tags
    fetchMock.mockResolvedValueOnce({
      json: async () => [
        {
          id: 100,
          user_id: "u1",
          start: "2026-01-01",
          end: "2026-01-05",
          list_id: 1,
          isRenting: 0,
        },
      ],
    });

    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents[0].backgroundColor).toBe("#3788D8");
  });

  it("handles empty reserves response", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });
    fetchMock.mockResolvedValueOnce({ json: async () => [] });
    fetchMock.mockResolvedValueOnce({ json: async () => [] });
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents).toEqual([]);
  });

  it("stops the skeleton and reports isError when a fetch rejects", async () => {
    // 以前は fetch 失敗で isFetching が下りず無限スケルトンになっていた（回帰防止）
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.allEvents).toEqual([]);
    consoleErrorSpy.mockRestore();
  });

  it("recovers after a successful refetch", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isError).toBe(true));

    fetchMock.mockResolvedValue({ json: async () => [] });
    await result.current.refetch();

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.isFetching).toBe(false);
    consoleErrorSpy.mockRestore();
  });
});
