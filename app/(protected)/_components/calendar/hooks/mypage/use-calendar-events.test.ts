import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCalendarEvents, type Reserve } from "./use-calendar-events";

const makeReserve = (partial: Partial<Reserve>): Reserve => ({
  id: 1,
  user_id: "u1",
  start: new Date("2026-01-01"),
  end: new Date("2026-01-05"),
  list_id: 10,
  isRenting: 0,
  ...partial,
});

describe("useCalendarEvents", () => {
  it("starts with empty allEvents and isFetching=true", () => {
    const filteredData: Reserve[] = [];
    const idToNameMap = {};
    const listColorMap = {};
    const { result } = renderHook(() =>
      useCalendarEvents({ filteredData, idToNameMap, listColorMap }),
    );
    expect(result.current.allEvents).toEqual([]);
    expect(result.current.isFetching).toBe(true);
  });

  it("does not create events until listColorMap has entries", () => {
    const filteredData = [makeReserve({})];
    const idToNameMap = { 10: "Camera" };
    const listColorMap = {};
    const { result } = renderHook(() =>
      useCalendarEvents({ filteredData, idToNameMap, listColorMap }),
    );
    expect(result.current.allEvents).toEqual([]);
    expect(result.current.isFetching).toBe(true);
  });

  it("creates events with mapped title, color, and +1 day end", async () => {
    const filteredData = [makeReserve({ id: 100, list_id: 10 })];
    const idToNameMap = { 10: "Camera" };
    const listColorMap = { 10: "#ffffff" };

    const { result } = renderHook(() =>
      useCalendarEvents({ filteredData, idToNameMap, listColorMap }),
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents).toHaveLength(1);
    const ev = result.current.allEvents[0];
    expect(ev.title).toBe("Camera");
    expect(ev.backgroundColor).toBe("#ffffff");
    expect(ev.textColor).toBe("#000000");
    expect(ev.allDay).toBe(true);
    expect(ev.id).toBe(100);
    // end date should be Jan 6 (Jan 5 + 1)
    expect((ev.end as Date).getDate()).toBe(6);
  });

  it("uses default color when listColorMap lacks the list_id", async () => {
    const filteredData = [makeReserve({ list_id: 999 })];
    const idToNameMap = {};
    const listColorMap = { 10: "#ff0000" }; // 999 not present

    const { result } = renderHook(() =>
      useCalendarEvents({ filteredData, idToNameMap, listColorMap }),
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.allEvents[0].backgroundColor).toBe("#3788D8");
  });

  it("setAllEvents allows external mutation (for delete/append flows)", async () => {
    const filteredData = [makeReserve({ id: 1 })];
    const idToNameMap = { 10: "Camera" };
    const listColorMap = { 10: "#ffffff" };

    const { result } = renderHook(() =>
      useCalendarEvents({ filteredData, idToNameMap, listColorMap }),
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    act(() => {
      result.current.setAllEvents([]);
    });

    expect(result.current.allEvents).toEqual([]);
  });
});
