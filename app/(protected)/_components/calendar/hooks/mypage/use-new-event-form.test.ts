import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNewEventForm } from "./use-new-event-form";
import type { MypageCalendarEvent } from "./use-calendar-events";

const setAllEvents = vi.fn();

beforeEach(() => {
  setAllEvents.mockClear();
});

const setupHook = (allEvents: MypageCalendarEvent[] = []) =>
  renderHook(() => useNewEventForm({ allEvents, setAllEvents }));

const fakeFormEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as React.FormEvent<HTMLFormElement>;

describe("useNewEventForm - initial state", () => {
  it("starts with empty event and closed modal", () => {
    const { result } = setupHook();
    expect(result.current.showModal).toBe(false);
    expect(result.current.newEvent.title).toBe("");
    expect(result.current.newEvent.id).toBe(0);
  });
});

describe("useNewEventForm - handleDateClick", () => {
  it("sets start, allDay, fresh id, and opens modal", () => {
    const { result } = setupHook();
    const date = new Date("2026-01-01");

    act(() => {
      result.current.handleDateClick({ date, allDay: true });
    });

    expect(result.current.showModal).toBe(true);
    expect(result.current.newEvent.start).toBe(date);
    expect(result.current.newEvent.allDay).toBe(true);
    expect(result.current.newEvent.id).toBeGreaterThan(0);
  });
});

describe("useNewEventForm - handleChange", () => {
  it("updates title from input event", () => {
    const { result } = setupHook();

    act(() => {
      result.current.handleChange({
        target: { value: "New camera" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.newEvent.title).toBe("New camera");
  });
});

describe("useNewEventForm - handleSubmit", () => {
  it("appends newEvent to allEvents, closes modal, and resets state", () => {
    const existing: MypageCalendarEvent = {
      title: "Existing",
      start: "2025-12-01",
      end: "2025-12-02",
      allDay: true,
      id: 99,
    };
    const { result } = setupHook([existing]);

    act(() => {
      result.current.handleChange({
        target: { value: "New" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleSubmit(fakeFormEvent());
    });

    expect(setAllEvents).toHaveBeenCalledWith([
      existing,
      expect.objectContaining({ title: "New" }),
    ]);
    expect(result.current.showModal).toBe(false);
    expect(result.current.newEvent.title).toBe("");
  });
});

describe("useNewEventForm - addEvent (drag)", () => {
  it("appends drag-dropped event with date + draggedEl text", () => {
    const { result } = setupHook();

    const dropArg = {
      date: new Date("2026-02-01"),
      draggedEl: { innerText: "Dropped" } as HTMLElement,
      allDay: false,
    } as unknown as Parameters<typeof result.current.addEvent>[0];

    act(() => {
      result.current.addEvent(dropArg);
    });

    expect(setAllEvents).toHaveBeenCalledWith([
      expect.objectContaining({ title: "Dropped" }),
    ]);
  });
});

describe("useNewEventForm - closeModal", () => {
  it("closes the modal and resets event state", () => {
    const { result } = setupHook();

    act(() => {
      result.current.handleDateClick({ date: new Date("2026-01-01"), allDay: true });
    });

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.showModal).toBe(false);
    expect(result.current.newEvent.title).toBe("");
  });
});
