import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { useEventNavigation } from "./use-event-navigation";
import type { CalendarEvent } from "./use-calendar-data";

const makeEvent = (partial: Partial<CalendarEvent>): CalendarEvent => ({
  textColor: "#000000",
  isRenting: 0,
  name: "user",
  title: "Camera",
  start: "2026-01-01",
  end: "2026-01-02",
  allDay: true,
  id: 1,
  list_id: 10,
  ...partial,
});

beforeEach(() => {
  pushMock.mockReset();
});

describe("useEventNavigation", () => {
  it("pushes to /ems/reserve/<list_id> for the matching event", () => {
    const events = [makeEvent({ id: 100, list_id: 42 })];
    const { result } = renderHook(() => useEventNavigation(events));

    result.current.navigateToDetail({ event: { id: "100" } });

    expect(pushMock).toHaveBeenCalledWith("/ems/reserve/42");
  });

  it("pushes to /ems/reserve/undefined when event id is not found (preserves existing behavior)", () => {
    const { result } = renderHook(() => useEventNavigation([]));

    result.current.navigateToDetail({ event: { id: "999" } });

    expect(pushMock).toHaveBeenCalledWith("/ems/reserve/undefined");
  });

  it("converts string id to number when matching", () => {
    const events = [makeEvent({ id: 7, list_id: 3 })];
    const { result } = renderHook(() => useEventNavigation(events));

    result.current.navigateToDetail({ event: { id: "7" } });

    expect(pushMock).toHaveBeenCalledWith("/ems/reserve/3");
  });
});
