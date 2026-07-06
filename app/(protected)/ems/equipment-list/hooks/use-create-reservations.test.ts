import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateReservations } from "./use-create-reservations";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCreateReservations", () => {
  it("全件成功で ok=true", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useCreateReservations());

    let res: Awaited<ReturnType<typeof result.current.createReservations>> | undefined;
    await act(async () => {
      res = await result.current.createReservations([1, 2, 3], "2026-07-10", "2026-07-12");
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/reserves");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      list_id: 1,
      start: "2026-07-10",
      end: "2026-07-12",
    });
    expect(res).toEqual({
      ok: true,
      conflict: false,
      createdCount: 3,
      createdIds: [1, 2, 3],
      conflictIds: [],
    });
  });

  it("409 が混ざると conflict=true・ok=false", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({}) });
    const { result } = renderHook(() => useCreateReservations());

    let res: Awaited<ReturnType<typeof result.current.createReservations>> | undefined;
    await act(async () => {
      res = await result.current.createReservations([1, 2], "2026-07-10", "2026-07-12");
    });

    expect(res).toEqual({
      ok: false,
      conflict: true,
      createdCount: 1,
      createdIds: [1],
      conflictIds: [2],
    });
  });

  it("409以外の失敗は API のエラーメッセージを拾う", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "予約開始日は今日以降にしてください。" }),
    });
    const { result } = renderHook(() => useCreateReservations());

    let res: Awaited<ReturnType<typeof result.current.createReservations>> | undefined;
    await act(async () => {
      res = await result.current.createReservations([1], "2020-01-01", "2020-01-02");
    });

    expect(res).toEqual({
      ok: false,
      conflict: false,
      createdCount: 0,
      createdIds: [],
      conflictIds: [],
      errorMessage: "予約開始日は今日以降にしてください。",
    });
  });

  it("ネットワーク例外は errorMessage なしの失敗扱い", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useCreateReservations());

    let res: Awaited<ReturnType<typeof result.current.createReservations>> | undefined;
    await act(async () => {
      res = await result.current.createReservations([1], "2026-07-10", "2026-07-12");
    });

    expect(res).toEqual({
      ok: false,
      conflict: false,
      createdCount: 0,
      createdIds: [],
      conflictIds: [],
    });
  });

  it("user_id は body に含めない（API がセッションから導出）", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useCreateReservations());

    await act(async () => {
      await result.current.createReservations([5], "2026-07-10", "2026-07-10");
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).not.toHaveProperty("user_id");
  });
});
