import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    // 実物と同じく isAxiosError フラグを見る簡易実装
    isAxiosError: (e: unknown) => !!(e as { isAxiosError?: boolean } | null)?.isAxiosError,
  },
}));

import axios from "axios";
import moment from "moment-timezone";
import { useReservationForm, isOverlapping } from "./use-reservation-form";
import type { Reserve, ReservationEvent } from "./use-reservation-data";

const makeReserve = (partial: Partial<Reserve>): Reserve => ({
  id: 1,
  user_id: "u1",
  start: "2026-01-01",
  end: "2026-01-05",
  list_id: 10,
  ...partial,
});

const setAllEvents = vi.fn();
const refetchReserves = vi.fn(async () => {});
const alertMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  vi.mocked(axios.post).mockReset();
  setAllEvents.mockClear();
  refetchReserves.mockClear();
  alertMock.mockReset();
  consoleErrorSpy.mockClear();
  vi.stubGlobal("alert", alertMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const fakeFormEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as React.FormEvent<HTMLFormElement>;

const defaultParams = (overrides?: {
  filteredData?: Reserve[];
  allEvents?: ReservationEvent[];
}) => ({
  userId: "u1",
  listId: 10,
  filteredData: overrides?.filteredData ?? [],
  allEvents: overrides?.allEvents ?? [],
  setAllEvents,
  refetchReserves,
});

const futureStart = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);
const futureEnd = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);

describe("isOverlapping (pure helper)", () => {
  it("returns false when filteredData is empty", () => {
    expect(
      isOverlapping(
        { title: "x", start: "2026-01-10", end: "2026-01-12", allDay: true, id: 1 },
        [],
      ),
    ).toBe(false);
  });

  it("detects newStart within existing range", () => {
    const reserves = [makeReserve({ start: "2026-01-10", end: "2026-01-15" })];
    expect(
      isOverlapping(
        { title: "x", start: "2026-01-12", end: "2026-01-20", allDay: true, id: 1 },
        reserves,
      ),
    ).toBe(true);
  });

  it("detects newEnd within existing range", () => {
    const reserves = [makeReserve({ start: "2026-01-10", end: "2026-01-15" })];
    expect(
      isOverlapping(
        { title: "x", start: "2026-01-05", end: "2026-01-12", allDay: true, id: 1 },
        reserves,
      ),
    ).toBe(true);
  });

  it("detects full containment", () => {
    const reserves = [makeReserve({ start: "2026-01-10", end: "2026-01-15" })];
    expect(
      isOverlapping(
        { title: "x", start: "2026-01-05", end: "2026-01-20", allDay: true, id: 1 },
        reserves,
      ),
    ).toBe(true);
  });

  it("returns false for disjoint ranges", () => {
    const reserves = [makeReserve({ start: "2026-01-10", end: "2026-01-15" })];
    expect(
      isOverlapping(
        { title: "x", start: "2026-01-01", end: "2026-01-05", allDay: true, id: 1 },
        reserves,
      ),
    ).toBe(false);
  });
});

describe("useReservationForm - state", () => {
  it("initializes newEvent with userId as title", () => {
    const { result } = renderHook(() => useReservationForm(defaultParams()));
    expect(result.current.newEvent.title).toBe("u1");
    expect(result.current.showModal).toBe(false);
  });

  it("resets newEvent when userId changes", () => {
    const { result, rerender } = renderHook(
      (params: { userId: string | undefined }) =>
        useReservationForm({ ...defaultParams(), userId: params.userId }),
      { initialProps: { userId: "u1" as string | undefined } },
    );

    act(() => {
      result.current.setNewEvent({
        title: "modified",
        start: "2026-01-01",
        end: "2026-01-02",
        allDay: true,
        id: 42,
      });
    });

    rerender({ userId: "u2" });

    expect(result.current.newEvent.title).toBe("u2");
    expect(result.current.newEvent.start).toBe("");
  });
});

describe("useReservationForm - handleDateClick", () => {
  it("sets start, allDay, id, and opens modal", () => {
    const { result } = renderHook(() => useReservationForm(defaultParams()));
    const date = new Date("2026-01-15");

    act(() => {
      result.current.handleDateClick({ date, allDay: true });
    });

    expect(result.current.showModal).toBe(true);
    expect(result.current.newEvent.start).toBe(date);
    expect(result.current.newEvent.allDay).toBe(true);
  });
});

describe("useReservationForm - closeModal", () => {
  it("closes the modal and resets newEvent to userId-titled empty", () => {
    const { result } = renderHook(() => useReservationForm(defaultParams()));

    act(() => {
      result.current.handleDateClick({ date: new Date("2026-01-01"), allDay: true });
    });

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.showModal).toBe(false);
    expect(result.current.newEvent.title).toBe("u1");
    expect(result.current.newEvent.start).toBe("");
  });
});

describe("useReservationForm - submit validation", () => {
  it("alerts when start or end is empty", async () => {
    const { result } = renderHook(() => useReservationForm(defaultParams()));

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith("日付を選択してください。");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("alerts on overlap and closes modal", async () => {
    const start = futureStart();
    const end = futureEnd();

    const { result } = renderHook(() =>
      useReservationForm({
        ...defaultParams({ filteredData: [makeReserve({ start, end })] }),
      }),
    );

    act(() => {
      result.current.updateStart(start);
    });
    act(() => {
      result.current.updateEnd(end);
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith(
      "この期間にはすでに予約が入っています。別の期間を選択してください。",
    );
    expect(axios.post).not.toHaveBeenCalled();
    expect(result.current.showModal).toBe(false);
  });

  it("alerts when end < start", async () => {
    const { result } = renderHook(() => useReservationForm(defaultParams()));

    act(() => {
      result.current.updateStart(futureEnd());
    });
    act(() => {
      result.current.updateEnd(futureStart());
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith("無効な予約日です。");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("alerts on past dates", async () => {
    const { result } = renderHook(() => useReservationForm(defaultParams()));

    act(() => {
      result.current.updateStart("2020-01-01");
    });
    act(() => {
      result.current.updateEnd("2020-01-02");
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith("無効な予約日です。");
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe("useReservationForm - submit success", () => {
  it("posts JST YYYY-MM-DD strings as-is (no +1 day), refetches, alerts success, and closes modal", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 201 } as never);

    const { result } = renderHook(() => useReservationForm(defaultParams()));

    const start = futureStart();
    const end = futureEnd();

    act(() => {
      result.current.updateStart(start);
    });
    act(() => {
      result.current.updateEnd(end);
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(axios.post).toHaveBeenCalledOnce();
    const postArgs = vi.mocked(axios.post).mock.calls[0]?.[1] as {
      user_id: string;
      start: string;
      end: string;
      list_id: number;
    };
    expect(postArgs.user_id).toBe("u1");
    expect(postArgs.list_id).toBe(10);
    // 実装と同じ式で期待値を計算する（実行環境のTZに依存しない）
    expect(postArgs.start).toBe(moment(start).tz("Asia/Tokyo").format("YYYY-MM-DD"));
    expect(postArgs.end).toBe(moment(end).tz("Asia/Tokyo").format("YYYY-MM-DD"));

    // 楽観的追加はしない（refetch がユーザー名解決済みのイベントで全置換する）
    expect(setAllEvents).not.toHaveBeenCalled();

    expect(alertMock).toHaveBeenCalledWith("予約が正常に完了しました。");
    await waitFor(() => expect(refetchReserves).toHaveBeenCalled());
    expect(result.current.showModal).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe("useReservationForm - submit failure", () => {
  const setupAndSubmit = async (result: {
    current: ReturnType<typeof useReservationForm>;
  }) => {
    act(() => {
      result.current.setShowModal(true);
    });
    act(() => {
      result.current.updateStart(futureStart());
    });
    act(() => {
      result.current.updateEnd(futureEnd());
    });
    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });
  };

  it("shows the conflict message and keeps the modal open on 409", async () => {
    vi.mocked(axios.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { error: "この期間にはすでに予約が入っています。" } },
    });

    const { result } = renderHook(() => useReservationForm(defaultParams()));
    await setupAndSubmit(result);

    expect(alertMock).toHaveBeenCalledWith(
      "この期間にはすでに予約が入っています。別の期間を選択してください。",
    );
    expect(result.current.showModal).toBe(true);
    expect(refetchReserves).not.toHaveBeenCalled();
    expect(setAllEvents).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("shows the server message on 400", async () => {
    vi.mocked(axios.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { error: "予約開始日は今日以降にしてください。" } },
    });

    const { result } = renderHook(() => useReservationForm(defaultParams()));
    await setupAndSubmit(result);

    expect(alertMock).toHaveBeenCalledWith("予約開始日は今日以降にしてください。");
    expect(result.current.showModal).toBe(true);
  });

  it("shows a generic message on unexpected errors", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useReservationForm(defaultParams()));
    await setupAndSubmit(result);

    expect(alertMock).toHaveBeenCalledWith("予約の作成中にエラーが発生しました。");
    expect(result.current.showModal).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });
});
