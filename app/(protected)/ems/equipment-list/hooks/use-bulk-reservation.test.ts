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
import type { Equipment, Reserve } from "@/types/domain";
import { useBulkReservation } from "./use-bulk-reservation";

const makeEquipment = (partial: Partial<Equipment>): Equipment => ({
  id: 1,
  name: "Camera",
  detail: "",
  image: "",
  tag_id: "1",
  ...partial,
});

const makeReserve = (partial: Partial<Reserve>): Reserve => ({
  id: 1,
  user_id: "u1",
  start: "2026-01-01",
  end: "2026-01-02",
  list_id: 1,
  ...partial,
});

const fakeFormEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as React.FormEvent<HTMLFormElement>;

const refetchReserves = vi.fn(async () => {});
const alertMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

const defaultParams = {
  userId: "u1",
  equipments: [
    makeEquipment({ id: 1, name: "Camera" }),
    makeEquipment({ id: 2, name: "Tripod" }),
  ],
  reserves: [] as Reserve[],
  refetchReserves,
};

const futureStart = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);
const futureEnd = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);

beforeEach(() => {
  vi.mocked(axios.post).mockReset();
  refetchReserves.mockClear();
  alertMock.mockReset();
  consoleErrorSpy.mockClear();
  vi.stubGlobal("alert", alertMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useBulkReservation - mode + selection", () => {
  it("toggles bulk mode and clears selection", () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
    });
    expect(result.current.selectedIds.has(1)).toBe(true);

    act(() => {
      result.current.toggleBulkMode();
    });
    expect(result.current.isBulkMode).toBe(true);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("toggleEquipment adds and removes IDs", () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.toggleEquipment(2, true);
    });
    expect(Array.from(result.current.selectedIds).sort()).toEqual([1, 2]);

    act(() => {
      result.current.toggleEquipment(1, false);
    });
    expect(Array.from(result.current.selectedIds)).toEqual([2]);
  });
});

describe("useBulkReservation - modal control", () => {
  it("alerts when no equipment is selected", async () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    await act(async () => {
      await result.current.openModal();
    });

    expect(alertMock).toHaveBeenCalledWith("少なくとも1つの機材を選択してください。");
    expect(result.current.showModal).toBe(false);
    expect(refetchReserves).not.toHaveBeenCalled();
  });

  it("opens modal and refetches reserves when selection exists", async () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
    });

    await act(async () => {
      await result.current.openModal();
    });

    expect(refetchReserves).toHaveBeenCalledOnce();
    expect(result.current.showModal).toBe(true);
  });

  it("closeModal hides modal and resets form", () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.updateForm({ start: "2026-01-01", end: "2026-01-02" });
    });
    act(() => {
      result.current.closeModal();
    });

    expect(result.current.showModal).toBe(false);
    expect(result.current.bulkForm).toEqual({ start: "", end: "" });
  });
});

describe("useBulkReservation - submit validation", () => {
  it("alerts when date fields are empty", async () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith("開始日と終了日を選択してください。");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("alerts on past dates", async () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.updateForm({ start: "2020-01-01", end: "2020-01-02" });
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith(
      "無効な予約日です。開始日は今日以降、終了日は開始日以降を選択してください。",
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("alerts when end < start", async () => {
    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.updateForm({ start: futureEnd(), end: futureStart() });
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith(
      "無効な予約日です。開始日は今日以降、終了日は開始日以降を選択してください。",
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("alerts when there is an overlap and lists conflicting names", async () => {
    const start = futureStart();
    const end = futureEnd();

    const { result } = renderHook(() =>
      useBulkReservation({
        ...defaultParams,
        reserves: [makeReserve({ list_id: 1, start, end })],
      }),
    );

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.updateForm({ start, end });
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock.mock.calls[0]?.[0]).toContain("Camera");
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe("useBulkReservation - submit success path", () => {
  it("posts once per selected equipment, alerts, and resets state", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200 } as never);

    const { result } = renderHook(() => useBulkReservation(defaultParams));

    const start = futureStart();
    const end = futureEnd();

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.toggleEquipment(2, true);
      result.current.updateForm({ start, end });
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledWith("/api/reserves", {
      user_id: "u1",
      start,
      end,
      list_id: 1,
    });
    expect(axios.post).toHaveBeenCalledWith("/api/reserves", {
      user_id: "u1",
      start,
      end,
      list_id: 2,
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(false));

    expect(alertMock).toHaveBeenCalledWith("2件の予約が正常に完了しました。");
    expect(result.current.showModal).toBe(false);
    expect(result.current.bulkForm).toEqual({ start: "", end: "" });
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.isBulkMode).toBe(false);
  });

  it("alerts on POST failure and clears isSubmitting", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.updateForm({ start: futureStart(), end: futureEnd() });
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith("予約の作成中にエラーが発生しました。");
    expect(result.current.isSubmitting).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("shows the conflict message and refetches on server-side 409", async () => {
    vi.mocked(axios.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { error: "この期間にはすでに予約が入っています。" } },
    });

    const { result } = renderHook(() => useBulkReservation(defaultParams));

    act(() => {
      result.current.toggleEquipment(1, true);
      result.current.updateForm({ start: futureStart(), end: futureEnd() });
    });

    await act(async () => {
      await result.current.submit(fakeFormEvent());
    });

    expect(alertMock).toHaveBeenCalledWith(
      "選択した期間にすでに予約が入っている機材があります。別の期間を選択してください。",
    );
    // Promise.all の部分成功を画面に反映するため refetch する
    expect(refetchReserves).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});
