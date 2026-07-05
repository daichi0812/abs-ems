import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarData } from "./use-calendar-data";

const fetchMock = vi.fn();
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
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

  it("extends end date by 1 day (FullCalendar exclusive-end semantics)", async () => {
    setupHappyPath();
    const { result } = renderHook(() => useCalendarData());

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    const end = result.current.allEvents[0].end as Date;
    expect(end.getDate()).toBe(6); // 1/5 + 1 = 1/6
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
});
