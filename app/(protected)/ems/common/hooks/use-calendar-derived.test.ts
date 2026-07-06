import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCalendarDerived } from "./use-calendar-derived";
import type { CalendarEvent } from "./use-calendar-data";
import { buildMonthMatrix, toJstDayIndex } from "@/lib/calendar/date-grid";

const GRID_FROM = toJstDayIndex("2026-01-01");
const GRID_TO = toJstDayIndex("2026-01-31");
const TODAY = toJstDayIndex("2026-01-10");

const matrix = buildMonthMatrix(2026, 0);

// 表示中月（1月）に掛かるイベントを組み立てる小さなファクトリ
const event = (over: Partial<CalendarEvent> & { id: number }): CalendarEvent => ({
  title: "Camera",
  start: "2026-01-05",
  end: "2026-01-08",
  allDay: true,
  name: "Taro",
  isRenting: 0,
  list_id: 1,
  backgroundColor: "#ff0000",
  borderColor: "#ff0000",
  textColor: "#ffffff",
  ...over,
});

const baseParams = {
  memberColors: new Map<string, string>(),
  memberImages: new Map<string, string>(),
  matrix,
  gridStartIdx: GRID_FROM,
  gridEndIdx: GRID_TO,
  isDesktop: true,
  ganttWindowStart: toJstDayIndex("2026-01-01"),
  ganttWindowEnd: toJstDayIndex("2026-01-31"),
  selectedKey: null as number | null,
  todayIdx: TODAY,
};

describe("useCalendarDerived", () => {
  it("lists only named members whose reservation overlaps the visible month grid", () => {
    const allEvents = [
      event({ id: 1, name: "Taro" }),
      event({ id: 2, name: "Jiro", title: "Mic" }),
      event({ id: 3, name: "" }), // 名前なしは除外
      // 表示中の月グリッドの外（12月）は除外
      event({ id: 4, name: "Saburo", start: "2025-12-01", end: "2025-12-03" }),
    ];
    const { result } = renderHook(() =>
      useCalendarDerived({ ...baseParams, allEvents })
    );
    expect(result.current.members).toEqual(["Taro", "Jiro"]);
  });

  it("returns the neutral fallback color for null/unknown names", () => {
    const allEvents = [event({ id: 1, name: "Taro" })];
    const { result } = renderHook(() =>
      useCalendarDerived({ ...baseParams, allEvents })
    );
    expect(result.current.memberColorOf(null)).toBe("#667085");
    expect(result.current.memberColorOf(undefined)).toBe("#667085");
    expect(result.current.memberColorOf("Nobody")).toBe("#667085");
  });

  it("prefers the member's self-selected color", () => {
    const allEvents = [event({ id: 1, name: "Taro" })];
    const { result } = renderHook(() =>
      useCalendarDerived({
        ...baseParams,
        allEvents,
        memberColors: new Map([["Taro", "#123456"]]),
      })
    );
    expect(result.current.memberColorOf("Taro")).toBe("#123456");
  });

  it("maps every event to a bar keyed by its id", () => {
    const allEvents = [
      event({ id: 1, name: "Taro" }),
      event({ id: 2, name: "Jiro" }),
    ];
    const { result } = renderHook(() =>
      useCalendarDerived({ ...baseParams, allEvents })
    );
    expect(result.current.barEvents.map((b) => b.key)).toEqual([1, 2]);
    expect(result.current.barEvents[0].label).toBe("Camera");
  });

  it("groups gantt rows by equipment and drops events outside the window", () => {
    const allEvents = [
      event({ id: 1, title: "Camera", name: "Taro" }),
      event({ id: 2, title: "Camera", name: "Jiro" }),
      event({ id: 3, title: "Mic", name: "Taro" }),
      // ガント窓の外は除外
      event({ id: 4, title: "Tripod", start: "2026-03-01", end: "2026-03-03" }),
    ];
    const { result } = renderHook(() =>
      useCalendarDerived({
        ...baseParams,
        allEvents,
        ganttWindowStart: toJstDayIndex("2026-01-01"),
        ganttWindowEnd: toJstDayIndex("2026-01-31"),
      })
    );
    const rows = result.current.ganttRows;
    expect(rows.map((r) => r.name)).toEqual(["Camera", "Mic"]);
    expect(rows[0].bars.map((b) => b.key)).toEqual([1, 2]);
  });

  it("builds detail only for the selected event", () => {
    const allEvents = [
      event({ id: 1, name: "Taro", title: "Camera", start: "2026-01-05", end: "2026-01-08" }),
    ];
    const { result: none } = renderHook(() =>
      useCalendarDerived({ ...baseParams, allEvents, selectedKey: null })
    );
    expect(none.current.detail).toBeNull();

    const { result } = renderHook(() =>
      useCalendarDerived({ ...baseParams, allEvents, selectedKey: 1 })
    );
    expect(result.current.detail).toMatchObject({
      who: "Taro",
      equipment: "Camera",
    });
  });
});
